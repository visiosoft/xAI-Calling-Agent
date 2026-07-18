import { Queue } from "bullmq";
import type { CallJobData, PostCallJobData } from "@xai-calling/shared";
import { getRedisConnection } from "./connection.js";

export const QUEUE_NAMES = {
  CALL: "call-queue",
  POST_CALL: "post-call-processing",
} as const;

let callQueue: Queue<CallJobData> | null = null;
let postCallQueue: Queue<PostCallJobData> | null = null;

export function getCallQueue(): Queue<CallJobData> {
  if (!callQueue) {
    callQueue = new Queue<CallJobData>(QUEUE_NAMES.CALL, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return callQueue;
}

export function getPostCallQueue(): Queue<PostCallJobData> {
  if (!postCallQueue) {
    postCallQueue = new Queue<PostCallJobData>(QUEUE_NAMES.POST_CALL, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return postCallQueue;
}
