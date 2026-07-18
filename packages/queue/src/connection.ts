import { type ConnectionOptions } from "bullmq";

export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  const useTls = parsed.protocol === "rediss:";
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379"),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: useTls ? {} : undefined,
    maxRetriesPerRequest: null,
    family: 0,
    enableOfflineQueue: true,
    connectTimeout: 30000,
  };
}
