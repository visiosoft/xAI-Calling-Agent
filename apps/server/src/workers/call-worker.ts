import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@xai-calling/queue";
import type { CallJobData } from "@xai-calling/shared";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/encryption.js";
import { createTelephonyProvider } from "../telephony/index.js";
import { callSessionManager } from "../bridge/index.js";

async function processCallJob(job: { data: CallJobData }) {
  const { callId, campaignId, contactId, organizationId, attemptNumber } =
    job.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { agent: true },
  });

  if (!campaign || campaign.status !== "RUNNING") {
    console.log(`Campaign ${campaignId} not running, skipping call ${callId}`);
    return;
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact || contact.doNotCall) {
    console.log(`Contact ${contactId} skipped (DNC or not found)`);
    await prisma.call.update({
      where: { id: callId },
      data: { status: "CANCELLED" },
    });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { providerConfigs: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const providerConfig = org.providerConfigs.find((c) => c.isDefault) ||
    org.providerConfigs[0];

  if (!providerConfig) {
    throw new Error("No telephony provider configured");
  }

  const orgConcurrency = callSessionManager.getActiveCountForOrg(organizationId);
  if (orgConcurrency >= org.maxConcurrentCalls) {
    throw new Error("Org concurrency limit reached, will retry");
  }

  const campaignConcurrency =
    callSessionManager.getActiveCountForCampaign(campaignId);
  if (campaignConcurrency >= campaign.maxConcurrentCalls) {
    throw new Error("Campaign concurrency limit reached, will retry");
  }

  const provider = createTelephonyProvider({
    provider: providerConfig.provider,
    accountSid: providerConfig.accountSid,
    authToken: decrypt(providerConfig.authToken),
  });

  const serverUrl = process.env.SERVER_URL || "http://localhost:3001";

  await prisma.call.update({
    where: { id: callId },
    data: {
      status: "INITIATING",
      startedAt: new Date(),
      retryCount: attemptNumber - 1,
    },
  });

  try {
    const result = await provider.initiateCall({
      to: contact.phoneNumber,
      from: campaign.callerIdNumber,
      webhookUrl: `${serverUrl}/webhooks/twilio/voice?callId=${callId}`,
      statusCallbackUrl: `${serverUrl}/webhooks/twilio/status?callId=${callId}`,
      callId,
      machineDetection: true,
    });

    await prisma.call.update({
      where: { id: callId },
      data: {
        twilioCallSid: result.callSid,
        status: "RINGING",
      },
    });

    console.log(
      `Call ${callId} initiated (SID: ${result.callSid}) to ${contact.phoneNumber}`
    );
  } catch (error: any) {
    console.error(`Failed to initiate call ${callId}:`, error.message);
    await prisma.call.update({
      where: { id: callId },
      data: {
        status: "FAILED",
        errorMessage: error.message,
        endedAt: new Date(),
      },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { failedCalls: { increment: 1 } },
    });

    if (attemptNumber < campaign.retryAttempts) {
      const { getCallQueue } = await import("@xai-calling/queue");
      const newCallRecord = await prisma.call.create({
        data: {
          organizationId,
          campaignId,
          contactId,
          fromNumber: campaign.callerIdNumber,
          toNumber: contact.phoneNumber,
          status: "QUEUED",
          retryCount: attemptNumber,
        },
      });

      await getCallQueue().add(
        `call-${newCallRecord.id}`,
        {
          callId: newCallRecord.id,
          campaignId,
          contactId,
          organizationId,
          attemptNumber: attemptNumber + 1,
        },
        { delay: campaign.retryDelayMinutes * 60 * 1000 }
      );
      console.log(
        `Retry scheduled for contact ${contactId}, attempt ${attemptNumber + 1}`
      );
    }
  }
}

export function startCallWorker() {
  const worker = new Worker<CallJobData>(
    QUEUE_NAMES.CALL,
    async (job) => processCallJob(job),
    {
      connection: getRedisConnection(),
      concurrency: 10,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Call job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Call job ${job.id} completed`);
  });

  worker.on("error", (err) => {
    console.warn("Call worker Redis error (will retry):", err.message);
  });

  console.log("Call worker started");
  return worker;
}
