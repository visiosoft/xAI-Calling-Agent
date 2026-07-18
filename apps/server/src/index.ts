import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import { registerRoutes } from "./routes/index.js";
import { registerWebSocketRoutes } from "./routes/ws.js";
import { startWorkers } from "./workers/index.js";

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

async function start() {
  await server.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await server.register(websocket);
  await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await server.register(formbody);

  registerRoutes(server);
  registerWebSocketRoutes(server);

  startWorkers();

  const port = parseInt(process.env.PORT || "3001");
  const host = process.env.HOST || "0.0.0.0";

  await server.listen({ port, host });
  server.log.info(`Server running on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
