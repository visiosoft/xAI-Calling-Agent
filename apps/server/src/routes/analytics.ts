import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';

export function registerAnalyticsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.get('/api/campaigns/:id/analytics', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    const [totalCalls, answeredCalls, outcomeCounts, durationStats] = await Promise.all([
      prisma.call.count({ where: { campaignId: id } }),
      prisma.call.count({
        where: { campaignId: id, status: 'COMPLETED' },
      }),
      prisma.call.groupBy({
        by: ['outcome'],
        where: { campaignId: id, outcome: { not: null } },
        _count: true,
      }),
      prisma.call.aggregate({
        where: { campaignId: id, duration: { not: null } },
        _avg: { duration: true },
        _sum: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
    ]);

    const answerRate = totalCalls > 0 ? answeredCalls / totalCalls : 0;

    return {
      campaignId: id,
      totalCalls,
      answeredCalls,
      answerRate: Math.round(answerRate * 10000) / 100,
      duration: {
        average: durationStats._avg.duration ?? 0,
        total: durationStats._sum.duration ?? 0,
        min: durationStats._min.duration ?? 0,
        max: durationStats._max.duration ?? 0,
      },
      outcomes: Object.fromEntries(
        outcomeCounts.map((o) => [o.outcome!, o._count])
      ),
    };
  });

  server.get('/api/analytics/overview', async (request) => {
    const { organizationId } = getUser(request);

    const [
      totalCampaigns,
      totalCalls,
      answeredCalls,
      outcomeCounts,
      durationStats,
      campaignsByStatus,
    ] = await Promise.all([
      prisma.campaign.count({ where: { organizationId } }),
      prisma.call.count({ where: { organizationId } }),
      prisma.call.count({
        where: { organizationId, status: 'COMPLETED' },
      }),
      prisma.call.groupBy({
        by: ['outcome'],
        where: { organizationId, outcome: { not: null } },
        _count: true,
        orderBy: { _count: { outcome: 'desc' } },
      }),
      prisma.call.aggregate({
        where: { organizationId, duration: { not: null } },
        _avg: { duration: true },
        _sum: { duration: true },
      }),
      prisma.campaign.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const answerRate = totalCalls > 0 ? answeredCalls / totalCalls : 0;

    return {
      totalCampaigns,
      totalCalls,
      answeredCalls,
      answerRate: Math.round(answerRate * 10000) / 100,
      averageDuration: durationStats._avg.duration ?? 0,
      totalDuration: durationStats._sum.duration ?? 0,
      topOutcomes: Object.fromEntries(
        outcomeCounts.map((o) => [o.outcome!, o._count])
      ),
      campaignsByStatus: Object.fromEntries(
        campaignsByStatus.map((s) => [s.status, s._count])
      ),
    };
  });
}
