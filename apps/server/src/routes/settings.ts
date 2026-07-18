import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';
import { encrypt, decrypt } from '../lib/encryption.js';
import {
  updateOrgSettingsSchema,
  providerConfigSchema,
} from '@xai-calling/shared';

export function registerSettingsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.get('/api/settings', async (request) => {
    const { organizationId } = getUser(request);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const providers = await prisma.providerConfig.findMany({
      where: { organizationId },
    });

    const maskedProviders = providers.map((p) => ({
      ...p,
      authToken: p.authToken ? '********' : null,
      accountSid: p.accountSid
        ? p.accountSid.slice(0, 6) + '...' + p.accountSid.slice(-4)
        : null,
    }));

    return {
      organization: {
        id: org!.id,
        name: org!.name,
        slug: org!.slug,
        plan: org!.plan,
        maxConcurrentCalls: org!.maxConcurrentCalls,
        xaiApiKeySet: !!org!.xaiApiKey,
      },
      providers: maskedProviders,
    };
  });

  server.patch('/api/settings', async (request, reply) => {
    const { organizationId } = getUser(request);
    const parsed = updateOrgSettingsSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    if (parsed.data.xaiApiKey !== undefined) {
      updateData.xaiApiKey = encrypt(parsed.data.xaiApiKey);
    }

    if (parsed.data.maxConcurrentCalls !== undefined) {
      updateData.maxConcurrentCalls = parsed.data.maxConcurrentCalls;
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        maxConcurrentCalls: org.maxConcurrentCalls,
        xaiApiKeySet: !!org.xaiApiKey,
      },
    };
  });

  server.post('/api/settings/telephony', async (request, reply) => {
    const { organizationId } = getUser(request);
    const parsed = providerConfigSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const encryptedAuthToken = encrypt(parsed.data.authToken);

    const providerConfig = await prisma.providerConfig.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: parsed.data.provider,
        },
      },
      update: {
        accountSid: parsed.data.accountSid,
        authToken: encryptedAuthToken,
        phoneNumbers: parsed.data.phoneNumbers,
      },
      create: {
        organizationId,
        provider: parsed.data.provider,
        accountSid: parsed.data.accountSid,
        authToken: encryptedAuthToken,
        phoneNumbers: parsed.data.phoneNumbers,
        isDefault: true,
      },
    });

    return reply.status(200).send({
      provider: {
        ...providerConfig,
        authToken: '********',
      },
    });
  });

  server.delete('/api/settings/telephony/:provider', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { provider } = request.params as { provider: string };

    const upperProvider = provider.toUpperCase();

    const config = await prisma.providerConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: upperProvider as any,
        },
      },
    });

    if (!config) {
      return reply.status(404).send({ error: 'Provider config not found' });
    }

    await prisma.providerConfig.delete({
      where: {
        organizationId_provider: {
          organizationId,
          provider: upperProvider as any,
        },
      },
    });

    return { success: true };
  });
}
