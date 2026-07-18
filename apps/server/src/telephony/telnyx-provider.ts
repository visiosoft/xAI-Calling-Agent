import type {
  TelephonyProvider,
  InitiateCallParams,
  InitiateCallResult,
  StreamParams,
  ParsedMediaMessage,
} from './types.js';

/**
 * Telnyx telephony provider implementation.
 *
 * Telnyx uses a different WebSocket media streaming format compared to Twilio:
 * - Events use snake_case names (e.g., "media.playback_started")
 * - Media payloads are wrapped differently in the JSON structure
 * - Call control uses the Telnyx Call Control API rather than TwiML
 * - Stream setup uses Telnyx TeXML or Call Control commands
 */
export class TelnyxProvider implements TelephonyProvider {
  public readonly name = 'TELNYX' as const;
  private apiKey: string;

  constructor(apiKey: string, _apiSecret: string) {
    this.apiKey = apiKey;
    // TODO: Initialize the Telnyx client
    // import Telnyx from 'telnyx';
    // this.client = new Telnyx(apiKey);
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
    // TODO: Implement using Telnyx Call Control API
    // const call = await this.client.calls.create({
    //   connection_id: '<telnyx_connection_id>',
    //   to: params.to,
    //   from: params.from,
    //   webhook_url: params.webhookUrl,
    //   answering_machine_detection: params.machineDetection ? 'detect_beep' : 'disabled',
    // });
    // return { callSid: call.data.call_control_id, status: call.data.state };
    throw new Error('TelnyxProvider.initiateCall is not yet implemented');
  }

  generateStreamTwiml(params: StreamParams): string {
    // TODO: Telnyx uses TeXML (their TwiML equivalent) with a different streaming setup.
    // Telnyx media streaming is initiated via Call Control commands rather than inline XML.
    // For TeXML compatibility mode, the format is similar but uses Telnyx-specific elements.
    //
    // Alternative approach: use Call Control API to start media streaming:
    //   await this.client.calls.streaming_start(callControlId, {
    //     stream_url: params.websocketUrl,
    //     stream_track: 'inbound_track',
    //   });

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Connect>',
      `    <Stream url="${params.websocketUrl}">`,
      `      <Parameter name="callId" value="${params.callId}" />`,
      `      <Parameter name="campaignId" value="${params.campaignId}" />`,
      `      <Parameter name="contactId" value="${params.contactId}" />`,
      `      <Parameter name="organizationId" value="${params.organizationId}" />`,
      '    </Stream>',
      '  </Connect>',
      '</Response>',
    ].join('\n');
  }

  parseMediaMessage(msg: any): ParsedMediaMessage | null {
    let data: any;

    if (typeof msg === 'string') {
      try {
        data = JSON.parse(msg);
      } catch {
        return null;
      }
    } else {
      data = msg;
    }

    // TODO: Map Telnyx WebSocket event types to our unified format.
    // Telnyx uses a different event structure, e.g.:
    //   { "event": "media", "media": { "track": "inbound", "chunk": "...", "payload": "base64..." } }
    //   { "event": "start", "start": { "stream_id": "...", "call_control_id": "..." } }
    //   { "event": "stop" }

    const event = data?.event;
    if (!event) return null;

    switch (event) {
      case 'connected':
        return { type: 'connected' };

      case 'start':
        return {
          type: 'start',
          streamSid: data.start?.stream_id,
          callSid: data.start?.call_control_id,
          customParameters: data.start?.custom_parameters,
        };

      case 'media':
        return {
          type: 'media',
          streamSid: data.stream_id,
          audioPayload: data.media?.payload,
        };

      case 'stop':
        return {
          type: 'stop',
          streamSid: data.stream_id,
        };

      default:
        return null;
    }
  }

  formatOutgoingAudio(streamSid: string, audioPayload: string): string {
    // TODO: Verify Telnyx outbound media WebSocket message format
    return JSON.stringify({
      event: 'media',
      stream_id: streamSid,
      media: {
        payload: audioPayload,
      },
    });
  }

  formatClearMessage(streamSid: string): string {
    // TODO: Verify Telnyx clear/flush message format
    return JSON.stringify({
      event: 'clear',
      stream_id: streamSid,
    });
  }

  formatMarkMessage(streamSid: string, markName: string): string {
    // TODO: Verify Telnyx mark message format
    return JSON.stringify({
      event: 'mark',
      stream_id: streamSid,
      mark: {
        name: markName,
      },
    });
  }

  async hangUp(callSid: string): Promise<void> {
    // TODO: Implement using Telnyx Call Control API
    // await this.client.calls.hangup(callSid);
    throw new Error('TelnyxProvider.hangUp is not yet implemented');
  }

  validateWebhook(_request: any): boolean {
    // TODO: Implement Telnyx webhook signature verification
    // Telnyx signs webhooks with an ed25519 signature in the 'telnyx-signature-ed25519' header
    // and includes a timestamp in 'telnyx-timestamp'.
    return false;
  }
}
