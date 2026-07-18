import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.js';
import { registerAgentRoutes } from './agents.js';
import { registerContactRoutes } from './contacts.js';
import { registerCampaignRoutes } from './campaigns.js';
import { registerCallRoutes } from './calls.js';
import { registerAnalyticsRoutes } from './analytics.js';
import { registerSettingsRoutes } from './settings.js';
import { registerWebhookRoutes } from './webhooks.js';
import { registerVoicePreviewRoutes } from './voice-preview.js';

export function registerRoutes(server: FastifyInstance) {
  // Health check (no auth)
  server.get('/health', async () => ({ status: 'ok' }));

  // Auth routes (public + protected)
  server.register(async (instance) => registerAuthRoutes(instance));

  // Protected API routes (each encapsulated so addHook stays scoped)
  server.register(async (instance) => registerAgentRoutes(instance));
  server.register(async (instance) => registerContactRoutes(instance));
  server.register(async (instance) => registerCampaignRoutes(instance));
  server.register(async (instance) => registerCallRoutes(instance));
  server.register(async (instance) => registerAnalyticsRoutes(instance));
  server.register(async (instance) => registerSettingsRoutes(instance));
  server.register(async (instance) => registerVoicePreviewRoutes(instance));

  // Webhook routes (no auth)
  server.register(async (instance) => registerWebhookRoutes(instance));
}
