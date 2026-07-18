export interface TelephonyProvider {
  name: 'TWILIO' | 'TELNYX';
  initiateCall(params: InitiateCallParams): Promise<InitiateCallResult>;
  generateStreamTwiml(params: StreamParams): string;
  parseMediaMessage(msg: any): ParsedMediaMessage | null;
  formatOutgoingAudio(streamSid: string, audioPayload: string): string;
  formatClearMessage(streamSid: string): string;
  formatMarkMessage(streamSid: string, markName: string): string;
  hangUp(callSid: string): Promise<void>;
  validateWebhook(request: any): boolean;
}

export interface InitiateCallParams {
  to: string;
  from: string;
  webhookUrl: string;
  statusCallbackUrl: string;
  callId: string;
  machineDetection?: boolean;
}

export interface InitiateCallResult {
  callSid: string;
  status: string;
}

export interface StreamParams {
  callId: string;
  campaignId: string;
  contactId: string;
  organizationId: string;
  websocketUrl: string;
}

export interface ParsedMediaMessage {
  type: 'connected' | 'start' | 'media' | 'stop' | 'mark' | 'dtmf';
  streamSid?: string;
  callSid?: string;
  audioPayload?: string;
  customParameters?: Record<string, string>;
  markName?: string;
  digit?: string;
}
