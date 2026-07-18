import { z } from "zod";
import { TELEPHONY_PROVIDERS, CALL_OUTCOMES } from "./constants.js";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(1),
  voice: z.string().default("alloy"),
  languageHint: z.string().optional(),
  greeting: z.string().optional(),
  maxCallDuration: z.number().int().min(30).max(1800).default(300),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  })).optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const createContactSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Must be E.164 format"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  customFields: z.record(z.string()).optional(),
  timezone: z.string().optional(),
});

export const createContactListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  agentId: z.string(),
  contactListId: z.string(),
  maxConcurrentCalls: z.number().int().min(1).max(50).default(3),
  callsPerMinute: z.number().int().min(1).max(30).default(2),
  retryAttempts: z.number().int().min(0).max(5).default(2),
  retryDelayMinutes: z.number().int().min(1).max(1440).default(30),
  callerIdNumber: z.string(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const providerConfigSchema = z.object({
  provider: z.enum(TELEPHONY_PROVIDERS),
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  phoneNumbers: z.array(z.string()),
});

export const updateOrgSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  xaiApiKey: z.string().optional(),
  maxConcurrentCalls: z.number().int().min(1).max(100).optional(),
  telephonyConfig: providerConfigSchema.optional(),
});

export const callOutcomeSchema = z.enum(CALL_OUTCOMES);

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateContactListInput = z.infer<typeof createContactListSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ProviderConfigInput = z.infer<typeof providerConfigSchema>;
export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;
