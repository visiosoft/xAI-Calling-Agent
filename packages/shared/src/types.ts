import type {
  CALL_OUTCOMES,
  CALL_STATUSES,
  CAMPAIGN_STATUSES,
  TELEPHONY_PROVIDERS,
} from "./constants.js";

export type TelephonyProvider = (typeof TELEPHONY_PROVIDERS)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CallStatus = (typeof CALL_STATUSES)[number];
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export interface TranscriptEntry {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
}

export interface ToolCallResult {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  timestamp: number;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface TelephonyWebSocketMessage {
  type: "connected" | "start" | "media" | "stop" | "mark";
  streamSid?: string;
  media?: {
    payload: string;
    track?: string;
    chunk?: string;
    timestamp?: string;
  };
  start?: {
    streamSid: string;
    callSid: string;
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  mark?: {
    name: string;
  };
}

export interface XaiSessionConfig {
  voice: string;
  instructions: string;
  turnDetection: {
    type: "server_vad";
    threshold?: number;
    silence_duration_ms?: number;
  };
  audio: {
    input: { format: { type: string } };
    output: { format: { type: string } };
  };
  tools?: AgentToolDefinition[];
}

export interface CallJobData {
  callId: string;
  campaignId: string;
  contactId: string;
  organizationId: string;
  attemptNumber: number;
}

export interface PostCallJobData {
  callId: string;
  organizationId: string;
}
