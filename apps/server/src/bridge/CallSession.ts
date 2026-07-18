import WebSocket from 'ws';
import {
  XAI_REALTIME_URL,
  XAI_REALTIME_MODEL,
  DEFAULT_MAX_CALL_DURATION,
} from '@xai-calling/shared';
import type {
  TranscriptEntry,
  XaiSessionConfig,
  AgentToolDefinition,
  CallOutcome,
} from '@xai-calling/shared';
import { getPostCallQueue } from '@xai-calling/queue';
import { prisma } from '../lib/prisma.js';
import type { TelephonyProvider, ParsedMediaMessage } from '../telephony/types.js';
import { callSessionManager } from './CallSessionManager.js';

export type CallSessionState = 'connecting' | 'active' | 'ending' | 'ended';

export interface CallSessionParams {
  callId: string;
  callSid: string;
  streamSid: string;
  organizationId: string;
  campaignId: string;
  contactId: string;
  telephonyWs: WebSocket;
  telephonyProvider: TelephonyProvider;
  agentConfig: {
    voice: string;
    systemPrompt: string;
    tools: AgentToolDefinition[];
    maxCallDuration?: number;
  };
  xaiApiKey: string;
}

export class CallSession {
  public readonly callId: string;
  public readonly callSid: string;
  public streamSid: string;
  public readonly organizationId: string;
  public readonly campaignId: string;
  public readonly contactId: string;

  private telephonyWs: WebSocket;
  private xaiWs: WebSocket | null = null;
  private state: CallSessionState = 'connecting';
  private transcriptChunks: TranscriptEntry[] = [];
  private agentConfig: CallSessionParams['agentConfig'];
  private telephonyProvider: TelephonyProvider;
  private xaiApiKey: string;
  private startedAt: number;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMarks: Set<string> = new Set();
  private callOutcome: CallOutcome | null = null;
  private activeResponseId: string | null = null;
  private cancelledResponseIds: Set<string> = new Set();

  constructor(params: CallSessionParams) {
    this.callId = params.callId;
    this.callSid = params.callSid;
    this.streamSid = params.streamSid;
    this.organizationId = params.organizationId;
    this.campaignId = params.campaignId;
    this.contactId = params.contactId;
    this.telephonyWs = params.telephonyWs;
    this.telephonyProvider = params.telephonyProvider;
    this.agentConfig = params.agentConfig;
    this.xaiApiKey = params.xaiApiKey;
    this.startedAt = Date.now();
  }

  public getState(): CallSessionState {
    return this.state;
  }

  public async initialize(): Promise<void> {
    const wsUrl = `${XAI_REALTIME_URL}?model=${XAI_REALTIME_MODEL}`;

    this.xaiWs = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${this.xaiApiKey}`,
      },
    });

    this.xaiWs.on('open', () => {
      console.log(`[CallSession ${this.callId}] xAI WebSocket connected`);

      // Send session.update configuration
      const sessionConfig = {
        voice: this.agentConfig.voice,
        instructions: this.agentConfig.systemPrompt,
        turn_detection: { type: 'server_vad' },
        audio: {
          input: { format: { type: 'audio/pcmu' } },
          output: { format: { type: 'audio/pcmu' } },
        },
        tools: this.agentConfig.tools,
      };

      this.sendToXai({
        type: 'session.update',
        session: sessionConfig,
      });

      this.sendToXai({
        type: 'response.create',
        response: {},
      });

      this.state = 'active';
    });

    this.xaiWs.on('message', (data: WebSocket.Data) => {
      this.handleXaiMessage(data);
    });

    this.xaiWs.on('close', (code, reason) => {
      console.log(
        `[CallSession ${this.callId}] xAI WebSocket closed: ${code} ${reason.toString()}`
      );
      if (this.state === 'active') {
        this.end('xai_disconnected').catch((err) => {
          console.error(`[CallSession ${this.callId}] Error ending call after xAI disconnect:`, err);
        });
      }
    });

    this.xaiWs.on('error', (err) => {
      console.error(`[CallSession ${this.callId}] xAI WebSocket error:`, err);
    });

    // Telephony message handling is done by ws.ts route handler
    // which calls session.handleTelephonyMessage() directly

    // Max duration timer
    const maxDuration =
      (this.agentConfig.maxCallDuration ?? DEFAULT_MAX_CALL_DURATION) * 1000;
    this.maxDurationTimer = setTimeout(() => {
      console.log(`[CallSession ${this.callId}] Max call duration reached`);
      this.end('max_duration').catch((err) => {
        console.error(`[CallSession ${this.callId}] Error ending call at max duration:`, err);
      });
    }, maxDuration);
  }

  public handleTelephonyMessage(parsed: ParsedMediaMessage): void {
    if (this.state !== 'active') return;

    switch (parsed.type) {
      case 'media':
        if (parsed.audioPayload) {
          this.sendToXai({
            type: 'input_audio_buffer.append',
            audio: parsed.audioPayload,
          });
        }
        break;

      case 'stop':
        console.log(`[CallSession ${this.callId}] Received stop from telephony`);
        this.end('telephony_stop').catch((err) => {
          console.error(`[CallSession ${this.callId}] Error ending call on stop:`, err);
        });
        break;

      case 'mark':
        if (parsed.markName) {
          this.pendingMarks.delete(parsed.markName);
        }
        break;

      default:
        break;
    }
  }

  private handleXaiMessage(data: WebSocket.Data): void {
    let event: any;
    try {
      event = JSON.parse(typeof data === 'string' ? data : data.toString());
    } catch {
      console.error(`[CallSession ${this.callId}] Failed to parse xAI message`);
      return;
    }

    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        console.log(`[CallSession ${this.callId}] ${event.type}`);
        break;

      case 'response.created':
        this.activeResponseId = event.response?.id ?? null;
        break;

      case 'response.cancelled':
      case 'response.done':
        if (event.response?.id) {
          if (event.type === 'response.cancelled') {
            this.cancelledResponseIds.add(event.response.id);
          }
          if (this.activeResponseId === event.response.id) {
            this.activeResponseId = null;
          }
        }
        break;

      case 'response.audio.delta':
      case 'response.output_audio.delta':
        if (event.response_id && this.cancelledResponseIds.has(event.response_id)) {
          break;
        }
        if (event.delta && this.streamSid) {
          const outgoing = this.telephonyProvider.formatOutgoingAudio(
            this.streamSid,
            event.delta
          );
          this.sendToTelephony(outgoing);
        }
        break;

      case 'response.audio.done':
        if (this.streamSid) {
          const markName = `audio_done_${Date.now()}`;
          this.pendingMarks.add(markName);
          const markMsg = this.telephonyProvider.formatMarkMessage(
            this.streamSid,
            markName
          );
          this.sendToTelephony(markMsg);
        }
        break;

      case 'response.audio_transcript.delta':
        // Accumulation handled at .done
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          this.transcriptChunks.push({
            role: 'assistant',
            text: event.transcript,
            timestamp: Date.now(),
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          this.transcriptChunks.push({
            role: 'user',
            text: event.transcript,
            timestamp: Date.now(),
          });
        }
        break;

      case 'input_audio_buffer.speech_started':
        console.log(`[CallSession ${this.callId}] Speech started - barge-in`);
        // Mark the current response as cancelled so in-flight audio deltas are dropped
        if (this.activeResponseId) {
          this.cancelledResponseIds.add(this.activeResponseId);
        }
        // Cancel the current AI response so it stops generating audio immediately
        this.sendToXai({ type: 'response.cancel' });
        // Clear Twilio's audio buffer so queued audio stops playing
        if (this.streamSid) {
          const clearMsg = this.telephonyProvider.formatClearMessage(this.streamSid);
          this.sendToTelephony(clearMsg);
        }
        break;

      case 'input_audio_buffer.speech_stopped':
      case 'input_audio_buffer.committed':
        break;

      case 'response.output_audio.done':
        if (this.streamSid) {
          const markName = `audio_done_${Date.now()}`;
          this.pendingMarks.add(markName);
          const markMsg = this.telephonyProvider.formatMarkMessage(
            this.streamSid,
            markName
          );
          this.sendToTelephony(markMsg);
        }
        break;

      case 'response.function_call_arguments.done':
        if (event.name && event.call_id) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(event.arguments ?? '{}');
          } catch {
            args = {};
          }
          this.handleToolCall(event.name, event.call_id, args).catch((err) => {
            console.error(`[CallSession ${this.callId}] Tool call error:`, err);
          });
        }
        break;

      case 'error':
        console.error(`[CallSession ${this.callId}] xAI error:`, JSON.stringify(event, null, 2));
        if (event.error?.code === 'session_expired' || event.error?.code === 'server_error') {
          this.end('xai_error').catch((err) => {
            console.error(`[CallSession ${this.callId}] Error ending call on xAI error:`, err);
          });
        }
        break;

      default:
        break;
    }
  }

  private async handleToolCall(
    name: string,
    toolCallId: string,
    args: Record<string, unknown>
  ): Promise<void> {
    let result: unknown;

    switch (name) {
      case 'end_call': {
        const reason = (args.reason as string) ?? 'agent_ended';
        result = { success: true, message: 'Call will be ended' };
        // Send tool result before ending so the AI can say goodbye
        this.sendToolResult(toolCallId, result);
        // Give xAI a moment to process, then end
        setTimeout(() => {
          this.end(reason).catch((err) => {
            console.error(`[CallSession ${this.callId}] Error ending call from tool:`, err);
          });
        }, 2000);
        return;
      }

      case 'mark_outcome': {
        const outcome = args.outcome as CallOutcome;
        const notes = (args.notes as string) ?? '';
        this.callOutcome = outcome;
        try {
          await prisma.call.update({
            where: { id: this.callId },
            data: {
              outcome,
              summary: notes || undefined,
            },
          });
          result = { success: true, outcome };
        } catch (err) {
          console.error(`[CallSession ${this.callId}] Error updating outcome:`, err);
          result = { success: false, error: 'Failed to update outcome' };
        }
        break;
      }

      case 'book_appointment': {
        // Placeholder for appointment booking integration
        const date = args.date as string | undefined;
        const time = args.time as string | undefined;
        console.log(
          `[CallSession ${this.callId}] Appointment booking requested: ${date} ${time}`
        );
        result = {
          success: true,
          message: `Appointment noted for ${date ?? 'unspecified date'} at ${time ?? 'unspecified time'}`,
        };
        break;
      }

      default:
        result = { success: false, error: `Unknown tool: ${name}` };
        break;
    }

    this.sendToolResult(toolCallId, result);
  }

  private sendToolResult(toolCallId: string, result: unknown): void {
    this.sendToXai({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify(result),
      },
    });

    this.sendToXai({
      type: 'response.create',
      response: {},
    });
  }

  public async end(reason: string): Promise<void> {
    if (this.state === 'ending' || this.state === 'ended') return;

    this.state = 'ending';
    console.log(`[CallSession ${this.callId}] Ending call: ${reason}`);

    // Clear max duration timer
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    // Cancel any in-progress AI response, then close xAI WebSocket
    if (this.xaiWs && this.xaiWs.readyState === WebSocket.OPEN) {
      this.sendToXai({ type: 'response.cancel' });
      this.xaiWs.close(1000, 'Call ended');
    }

    // Calculate duration
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);

    // Save to database
    try {
      await prisma.call.update({
        where: { id: this.callId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          duration: durationSeconds,
          transcript: this.transcriptChunks as any,
          errorMessage: reason === 'error' ? reason : undefined,
          ...(this.callOutcome ? { outcome: this.callOutcome } : {}),
        },
      });
    } catch (err) {
      console.error(`[CallSession ${this.callId}] Error saving call data:`, err);
    }

    // Queue post-call processing
    try {
      const postCallQueue = getPostCallQueue();
      await postCallQueue.add(`post-call-${this.callId}`, {
        callId: this.callId,
        organizationId: this.organizationId,
      });
    } catch (err) {
      console.error(`[CallSession ${this.callId}] Error queuing post-call processing:`, err);
    }

    this.state = 'ended';

    // Remove from session manager
    callSessionManager.removeSession(this.callId);

    console.log(
      `[CallSession ${this.callId}] Call ended. Duration: ${durationSeconds}s, Reason: ${reason}`
    );
  }

  private sendToXai(message: Record<string, unknown>): void {
    if (this.xaiWs && this.xaiWs.readyState === WebSocket.OPEN) {
      this.xaiWs.send(JSON.stringify(message));
    }
  }

  private sendToTelephony(message: string): void {
    if (this.telephonyWs.readyState === WebSocket.OPEN) {
      this.telephonyWs.send(message);
    }
  }
}
