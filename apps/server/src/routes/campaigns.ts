import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '@xai-calling/shared';
import type { CallJobData } from '@xai-calling/shared';
import { getCallQueue } from '@xai-calling/queue';

export function registerCampaignRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.get('/api/campaigns', async (request) => {
    const { organizationId } = getUser(request);

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      include: {
        agent: { select: { id: true, name: true } },
        contactList: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { campaigns };
  });

  server.post('/api/campaigns', async (request, reply) => {
    const { organizationId } = getUser(request);
    const parsed = createCampaignSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const agent = await prisma.agent.findFirst({
      where: { id: parsed.data.agentId, organizationId },
    });
    if (!agent) {
      return reply.status(400).send({ error: 'Agent not found' });
    }

    const contactList = await prisma.contactList.findFirst({
      where: { id: parsed.data.contactListId, organizationId },
    });
    if (!contactList) {
      return reply.status(400).send({ error: 'Contact list not found' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...parsed.data,
        organizationId,
        totalContacts: contactList.contactCount,
        status: 'DRAFT',
      },
    });

    return reply.status(201).send({ campaign });
  });

  server.get('/api/campaigns/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        agent: true,
        contactList: true,
      },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    const [statusCounts, outcomeCounts] = await Promise.all([
      prisma.call.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: true,
      }),
      prisma.call.groupBy({
        by: ['outcome'],
        where: { campaignId: id, outcome: { not: null } },
        _count: true,
      }),
    ]);

    return {
      campaign,
      stats: {
        byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
        byOutcome: Object.fromEntries(outcomeCounts.map((o) => [o.outcome!, o._count])),
      },
    };
  });

  server.patch('/api/campaigns/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (existing.status !== 'DRAFT') {
      return reply.status(400).send({ error: 'Can only update campaigns in DRAFT status' });
    }

    const parsed = updateCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: parsed.data,
    });

    return { campaign };
  });

  server.delete('/api/campaigns/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status === 'RUNNING') {
      return reply.status(400).send({ error: 'Cannot delete a running campaign. Cancel it first.' });
    }

    await prisma.call.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    return { success: true };
  });

  server.post('/api/campaigns/:id/launch', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { contactList: true, agent: true },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: 'Campaign must be in DRAFT or SCHEDULED status to launch' });
    }

    if (!campaign.agent) {
      return reply.status(400).send({ error: 'Campaign has no assigned agent' });
    }

    if (!campaign.callerIdNumber) {
      return reply.status(400).send({ error: 'Campaign has no caller ID number set' });
    }

    const providerConfig = await prisma.providerConfig.findFirst({
      where: { organizationId, isDefault: true },
    });

    if (!providerConfig) {
      return reply.status(400).send({ error: 'No telephony provider configured' });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        contactListId: campaign.contactListId,
        doNotCall: false,
      },
    });

    if (contacts.length === 0) {
      return reply.status(400).send({ error: 'No callable contacts in the list' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const callQueue = getCallQueue();
    const delayPerCall = 60000 / campaign.callsPerMinute;

    const callRecords = await Promise.all(
      contacts.map((contact) =>
        prisma.call.create({
          data: {
            organizationId,
            campaignId: id,
            contactId: contact.id,
            status: 'QUEUED',
            direction: 'OUTBOUND',
            fromNumber: campaign.callerIdNumber,
            toNumber: contact.phoneNumber,
          },
        })
      )
    );

    await Promise.all(
      callRecords.map((call, index) => {
        const jobData: CallJobData = {
          callId: call.id,
          campaignId: id,
          contactId: call.contactId!,
          organizationId,
          attemptNumber: 1,
        };

        return callQueue.add(`call-${call.id}`, jobData, {
          delay: Math.floor(index * delayPerCall),
        });
      })
    );

    return {
      success: true,
      totalCalls: callRecords.length,
      message: `Campaign launched with ${callRecords.length} calls`,
    };
  });

  server.post('/api/campaigns/:id/pause', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'RUNNING') {
      return reply.status(400).send({ error: 'Campaign must be RUNNING to pause' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return { success: true };
  });

  server.post('/api/campaigns/:id/resume', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'PAUSED') {
      return reply.status(400).send({ error: 'Campaign must be PAUSED to resume' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    return { success: true };
  });

  server.post('/api/campaigns/:id/cancel', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      return reply.status(400).send({ error: 'Campaign is already completed or cancelled' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await prisma.call.updateMany({
      where: { campaignId: id, status: 'QUEUED' },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  });
}
