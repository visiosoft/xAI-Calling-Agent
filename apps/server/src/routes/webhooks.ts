import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { decrypt } from '../lib/encryption.js';
import { TwilioProvider } from '../telephony/twilio-provider.js';

export function registerWebhookRoutes(server: FastifyInstance) {
  server.post('/webhooks/twilio/voice', async (request, reply) => {
    const { callId } = request.query as { callId?: string };

    if (!callId) {
      return reply.status(400).send({ error: 'Missing callId parameter' });
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        campaign: true,
        contact: true,
      },
    });

    if (!call) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    const body = request.body as Record<string, string>;
    const answeredBy = body?.AnsweredBy;

    if (answeredBy === 'machine_start' || answeredBy === 'fax') {
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'COMPLETED',
          outcome: 'VOICEMAIL',
          endedAt: new Date(),
        },
      });

      reply.header('Content-Type', 'text/xml');
      return reply.send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>'
      );
    }

    await prisma.call.update({
      where: { id: callId },
      data: {
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
        twilioCallSid: body?.CallSid || undefined,
      },
    });

    const providerConfig = await prisma.providerConfig.findFirst({
      where: { organizationId: call.organizationId, isDefault: true },
    });

    if (!providerConfig) {
      reply.header('Content-Type', 'text/xml');
      return reply.send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error. Goodbye.</Say><Hangup/></Response>'
      );
    }

    const decryptedAuthToken = decrypt(providerConfig.authToken);
    const provider = new TwilioProvider(providerConfig.accountSid, decryptedAuthToken);

    const host = request.headers.host || 'localhost:3001';
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

    const twiml = provider.generateStreamTwiml({
      websocketUrl: `${wsProtocol}://${host}/ws/media-stream`,
      callId: call.id,
      campaignId: call.campaignId!,
      contactId: call.contactId!,
      organizationId: call.organizationId,
    });

    reply.header('Content-Type', 'text/xml');
    return reply.send(twiml);
  });

  server.post('/webhooks/twilio/status', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const callSid = body?.CallSid;
    const callStatus = body?.CallStatus;

    if (!callSid || !callStatus) {
      // AMD callbacks send AnsweredBy without CallStatus — just acknowledge
      return reply.status(200).send({ received: true });
    }

    const call = await prisma.call.findFirst({
      where: { twilioCallSid: callSid },
    });

    if (!call) {
      return reply.status(200).send({ received: true });
    }

    const statusMap: Record<string, string> = {
      queued: 'QUEUED',
      initiated: 'INITIATING',
      ringing: 'RINGING',
      'in-progress': 'IN_PROGRESS',
      completed: 'COMPLETED',
      failed: 'FAILED',
      busy: 'BUSY',
      'no-answer': 'NO_ANSWER',
      canceled: 'CANCELLED',
    };

    const mappedStatus = statusMap[callStatus] || call.status;
    const updateData: Record<string, unknown> = { status: mappedStatus };

    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'canceled') {
      updateData.endedAt = new Date();

      if (body.CallDuration) {
        updateData.duration = parseInt(body.CallDuration);
      }
    }

    if (callStatus === 'failed') {
      updateData.errorMessage = body.SipResponseCode
        ? `SIP ${body.SipResponseCode}`
        : 'Call failed';
    }

    await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    });

    return reply.status(200).send({ received: true });
  });
}
