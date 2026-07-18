import { startCallWorker } from "./call-worker.js";
import { startPostCallWorker } from "./post-call-worker.js";

export function startWorkers() {
  console.log("Starting BullMQ workers...");
  try {
    startCallWorker();
    startPostCallWorker();
    console.log("Workers started successfully");
  } catch (err: any) {
    console.warn("BullMQ workers failed to start (Redis may be unavailable):", err.message);
    console.warn("The server will run without call queue processing. Fix REDIS_URL in .env to enable campaigns.");
  }
}
