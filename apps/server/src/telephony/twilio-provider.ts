import twilio from 'twilio';
import type { Twilio } from 'twilio';
import type {
  TelephonyProvider,
  InitiateCallParams,
  InitiateCallResult,
  StreamParams,
  ParsedMediaMessage,
} from './types.js';

export class TwilioProvider implements TelephonyProvider {
  public readonly name = 'TWILIO' as const;
  private client: Twilio;
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.client = twilio(accountSid, authToken);
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
    const callOptions: Record<string, any> = {
      to: params.to,
      from: params.from,
      url: params.webhookUrl,
      statusCallback: params.statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    };

    if (params.machineDetection) {
      callOptions.machineDetection = 'DetectMessageEnd';
      callOptions.asyncAmd = true;
      callOptions.asyncAmdStatusCallback = params.statusCallbackUrl;
      callOptions.asyncAmdStatusCallbackMethod = 'POST';
    }

    const call = await this.client.calls.create(callOptions as any);

    return {
      callSid: call.sid,
      status: call.status,
    };
  }

  generateStreamTwiml(params: StreamParams): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Connect>',
      `    <Stream url="${this.escapeXml(params.websocketUrl)}">`,
      `      <Parameter name="callId" value="${this.escapeXml(params.callId)}" />`,
      `      <Parameter name="campaignId" value="${this.escapeXml(params.campaignId)}" />`,
      `      <Parameter name="contactId" value="${this.escapeXml(params.contactId)}" />`,
      `      <Parameter name="organizationId" value="${this.escapeXml(params.organizationId)}" />`,
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

    const event = data?.event;
    if (!event) return null;

    switch (event) {
      case 'connected':
        return { type: 'connected' };

      case 'start':
        return {
          type: 'start',
          streamSid: data.start?.streamSid ?? data.streamSid,
          callSid: data.start?.callSid,
          customParameters: data.start?.customParameters,
        };

      case 'media':
        return {
          type: 'media',
          streamSid: data.streamSid,
          audioPayload: data.media?.payload,
        };

      case 'stop':
        return {
          type: 'stop',
          streamSid: data.streamSid,
        };

      case 'mark':
        return {
          type: 'mark',
          streamSid: data.streamSid,
          markName: data.mark?.name,
        };

      case 'dtmf':
        return {
          type: 'dtmf',
          streamSid: data.streamSid,
          digit: data.dtmf?.digit,
        };

      default:
        return null;
    }
  }

  formatOutgoingAudio(streamSid: string, audioPayload: string): string {
    return JSON.stringify({
      event: 'media',
      streamSid,
      media: {
        payload: audioPayload,
      },
    });
  }

  formatClearMessage(streamSid: string): string {
    return JSON.stringify({
      event: 'clear',
      streamSid,
    });
  }

  formatMarkMessage(streamSid: string, markName: string): string {
    return JSON.stringify({
      event: 'mark',
      streamSid,
      mark: {
        name: markName,
      },
    });
  }

  async hangUp(callSid: string): Promise<void> {
    await this.client.calls(callSid).update({ status: 'completed' });
  }

  validateWebhook(request: any): boolean {
    const signature = request.headers?.['x-twilio-signature'] ?? '';
    const url = request.url ?? '';
    const params = request.body ?? {};

    return twilio.validateRequest(this.authToken, signature, url, params);
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
