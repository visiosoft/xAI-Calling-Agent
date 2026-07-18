import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';

export function registerCallRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.get('/api/campaigns/:campaignId/calls', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { campaignId } = request.params as { campaignId: string };
    const {
      page = '1',
      limit = '50',
      status,
      outcome,
    } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      outcome?: string;
    };

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { campaignId };
    if (status) where.status = status;
    if (outcome) where.outcome = outcome;

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          contact: {
            select: { id: true, phoneNumber: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.call.count({ where }),
    ]);

    return {
      calls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  });

  server.get('/api/calls/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const call = await prisma.call.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        campaign: { select: { id: true, name: true } },
      },
    });

    if (!call) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    return { call };
  });
}
