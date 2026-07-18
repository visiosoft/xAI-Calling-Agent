export type {
  TelephonyProvider,
  InitiateCallParams,
  InitiateCallResult,
  StreamParams,
  ParsedMediaMessage,
} from './types.js';

export { TwilioProvider } from './twilio-provider.js';
export { TelnyxProvider } from './telnyx-provider.js';

import type { TelephonyProvider } from './types.js';
import { TwilioProvider } from './twilio-provider.js';
import { TelnyxProvider } from './telnyx-provider.js';

export interface TelephonyProviderConfig {
  provider: 'TWILIO' | 'TELNYX';
  accountSid: string;
  authToken: string;
}

export function createTelephonyProvider(config: TelephonyProviderConfig): TelephonyProvider {
  switch (config.provider) {
    case 'TWILIO':
      return new TwilioProvider(config.accountSid, config.authToken);
    case 'TELNYX':
      return new TelnyxProvider(config.accountSid, config.authToken);
    default:
      throw new Error(`Unsupported telephony provider: ${config.provider}`);
  }
}
