export const XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime";
export const XAI_REALTIME_MODEL = "grok-voice-think-fast-1.0";

export const XAI_VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "ash", name: "Ash", description: "Warm and conversational" },
  { id: "ballad", name: "Ballad", description: "Smooth and melodic" },
  { id: "coral", name: "Coral", description: "Clear and professional" },
  { id: "echo", name: "Echo", description: "Deep and resonant" },
  { id: "fable", name: "Fable", description: "Expressive and engaging" },
  { id: "juniper", name: "Juniper", description: "Bright and energetic" },
  { id: "sage", name: "Sage", description: "Calm and measured" },
  { id: "shimmer", name: "Shimmer", description: "Light and friendly" },
  { id: "verse", name: "Verse", description: "Articulate and precise" },
] as const;

export const CALL_OUTCOMES = [
  "INTERESTED",
  "NOT_INTERESTED",
  "APPOINTMENT_BOOKED",
  "CALLBACK_REQUESTED",
  "VOICEMAIL",
  "DO_NOT_CALL",
  "WRONG_NUMBER",
  "COMPLETED_SURVEY",
  "OTHER",
] as const;

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const CALL_STATUSES = [
  "QUEUED",
  "INITIATING",
  "RINGING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "NO_ANSWER",
  "BUSY",
  "CANCELLED",
] as const;

export const TELEPHONY_PROVIDERS = ["TWILIO", "TELNYX"] as const;

export const DEFAULT_MAX_CONCURRENT_CALLS = 5;
export const DEFAULT_CALLS_PER_MINUTE = 2;
export const DEFAULT_RETRY_ATTEMPTS = 2;
export const DEFAULT_RETRY_DELAY_MINUTES = 30;
export const DEFAULT_MAX_CALL_DURATION = 300;
