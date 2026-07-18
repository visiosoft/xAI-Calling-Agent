import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';
import { createAgentSchema, updateAgentSchema } from '@xai-calling/shared';

export function registerAgentRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.get('/api/agents', async (request) => {
    const { organizationId } = getUser(request);

    const agents = await prisma.agent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return { agents };
  });

  server.post('/api/agents', async (request, reply) => {
    const { organizationId } = getUser(request);
    const parsed = createAgentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const agent = await prisma.agent.create({
      data: {
        ...parsed.data,
        tools: (parsed.data.tools ?? []) as any,
        organizationId,
      },
    });

    return reply.status(201).send({ agent });
  });

  server.get('/api/agents/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const agent = await prisma.agent.findFirst({
      where: { id, organizationId },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return { agent };
  });

  server.patch('/api/agents/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.agent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const parsed = updateAgentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const updateData = { ...parsed.data } as any;
    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    return { agent };
  });

  server.delete('/api/agents/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.agent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const activeCampaigns = await prisma.campaign.count({
      where: {
        agentId: id,
        status: { in: ['RUNNING', 'SCHEDULED', 'PAUSED'] },
      },
    });

    if (activeCampaigns > 0) {
      return reply.status(409).send({
        error: 'Cannot delete agent with active campaigns',
      });
    }

    await prisma.$transaction(async (tx) => {
      const campaigns = await tx.campaign.findMany({
        where: { agentId: id },
        select: { id: true },
      });
      const campaignIds = campaigns.map((c) => c.id);

      if (campaignIds.length > 0) {
        await tx.call.deleteMany({ where: { campaignId: { in: campaignIds } } });
        await tx.campaign.deleteMany({ where: { id: { in: campaignIds } } });
      }

      await tx.agent.delete({ where: { id } });
    });

    return { success: true };
  });
}
