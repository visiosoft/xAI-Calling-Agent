import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@xai-calling/queue";
import type { PostCallJobData } from "@xai-calling/shared";
import { prisma } from "../lib/prisma.js";

async function processPostCallJob(job: { data: PostCallJobData }) {
  const { callId } = job.data;

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { campaign: true },
  });

  if (!call) {
    console.log(`Call ${callId} not found for post-processing`);
    return;
  }

  const transcript = call.transcript as Array<{
    role: string;
    text: string;
    timestamp: number;
  }> | null;

  if (transcript && transcript.length > 0) {
    const summary = transcript
      .map((t) => `${t.role}: ${t.text}`)
      .join("\n")
      .slice(0, 500);

    const hasPositiveOutcome = ["INTERESTED", "APPOINTMENT_BOOKED"].includes(
      call.outcome || ""
    );

    await prisma.call.update({
      where: { id: callId },
      data: {
        summary: `Call summary (${transcript.length} exchanges): ${summary}...`,
        sentiment: hasPositiveOutcome ? "positive" : call.outcome === "NOT_INTERESTED" ? "negative" : "neutral",
      },
    });
  }

  const campaignId = call.campaignId;
  const completedCount = await prisma.call.count({
    where: {
      campaignId,
      status: { in: ["COMPLETED", "FAILED", "NO_ANSWER", "BUSY", "CANCELLED"] },
    },
  });

  const totalContacts = call.campaign.totalContacts;
  if (completedCount >= totalContacts) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    console.log(`Campaign ${campaignId} completed`);
  }

  console.log(`Post-call processing done for call ${callId}`);
}

export function startPostCallWorker() {
  const worker = new Worker<PostCallJobData>(
    QUEUE_NAMES.POST_CALL,
    async (job) => processPostCallJob(job),
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Post-call job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.warn("Post-call worker Redis error (will retry):", err.message);
  });

  console.log("Post-call worker started");
  return worker;
}
