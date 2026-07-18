import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { callSessionManager } from "../bridge/index.js";
import { createTelephonyProvider } from "../telephony/index.js";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/encryption.js";

export function registerWebSocketRoutes(server: FastifyInstance) {
  server.register(async function (fastify) {
    fastify.get(
      "/ws/media-stream",
      { websocket: true },
      (socket: WebSocket, req) => {
        let callId: string | null = null;
        let streamSid: string | null = null;
        let sessionInitialized = false;

        server.log.info("WebSocket connection established for media stream");

        socket.on("message", async (message: Buffer | string) => {
          try {
            const data = JSON.parse(
              typeof message === "string" ? message : message.toString()
            );

            switch (data.event) {
              case "connected":
                server.log.info("Telephony media stream connected");
                break;

              case "start": {
                streamSid = data.start?.streamSid ?? data.streamSid;
                const customParams = data.start?.customParameters ?? {};
                callId = customParams.callId ?? null;
                const campaignId = customParams.campaignId ?? null;
                const contactId = customParams.contactId ?? null;
                const organizationId = customParams.organizationId ?? null;

                server.log.info(
                  { callId, campaignId, streamSid },
                  "Media stream started"
                );

                if (!callId || !campaignId || !contactId || !organizationId) {
                  server.log.error("Missing custom parameters in stream start");
                  socket.close();
                  return;
                }

                try {
                  const call = await prisma.call.findUnique({
                    where: { id: callId },
                    include: {
                      campaign: { include: { agent: true } },
                      organization: { include: { providerConfigs: true } },
                    },
                  });

                  if (!call) {
                    server.log.error({ callId }, "Call record not found");
                    socket.close();
                    return;
                  }

                  const providerConfig =
                    call.organization.providerConfigs.find(
                      (c) => c.isDefault
                    ) || call.organization.providerConfigs[0];

                  if (!providerConfig) {
                    server.log.error("No telephony provider configured");
                    socket.close();
                    return;
                  }

                  const telephonyProvider = createTelephonyProvider({
                    provider: providerConfig.provider,
                    accountSid: providerConfig.accountSid,
                    authToken: decrypt(providerConfig.authToken),
                  });

                  const xaiApiKey = call.organization.xaiApiKey
                    ? decrypt(call.organization.xaiApiKey)
                    : process.env.XAI_API_KEY;

                  if (!xaiApiKey) {
                    server.log.error("No xAI API key available");
                    socket.close();
                    return;
                  }

                  const agent = call.campaign.agent;
                  const contact = await prisma.contact.findUnique({
                    where: { id: contactId },
                  });

                  let systemPrompt = agent.systemPrompt;
                  if (contact) {
                    systemPrompt = systemPrompt
                      .replace(/\{\{firstName\}\}/g, contact.firstName || "")
                      .replace(/\{\{lastName\}\}/g, contact.lastName || "")
                      .replace(
                        /\{\{phoneNumber\}\}/g,
                        contact.phoneNumber || ""
                      );

                    const customFields =
                      (contact.customFields as Record<string, string>) || {};
                    for (const [key, value] of Object.entries(customFields)) {
                      systemPrompt = systemPrompt.replace(
                        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
                        value
                      );
                    }
                  }

                  const tools = (agent.tools as any[]) || [];

                  await callSessionManager.createSession({
                    callId,
                    callSid: call.twilioCallSid || "",
                    streamSid: streamSid || "",
                    organizationId,
                    campaignId,
                    contactId,
                    telephonyWs: socket,
                    telephonyProvider,
                    agentConfig: {
                      voice: agent.voice,
                      systemPrompt,
                      tools,
                      maxCallDuration: agent.maxCallDuration,
                    },
                    xaiApiKey,
                  });

                  sessionInitialized = true;

                  await prisma.call.update({
                    where: { id: callId },
                    data: {
                      status: "IN_PROGRESS",
                      twilioStreamSid: streamSid,
                      answeredAt: new Date(),
                    },
                  });
                } catch (err) {
                  server.log.error(
                    { err, callId },
                    "Failed to initialize call session"
                  );
                  socket.close();
                }
                break;
              }

              case "media": {
                if (!callId || !sessionInitialized) break;
                const session = callSessionManager.getSession(callId);
                if (session) {
                  const parsed = {
                    type: "media" as const,
                    streamSid: streamSid || undefined,
                    audioPayload: data.media?.payload,
                  };
                  session.handleTelephonyMessage(parsed);
                }
                break;
              }

              case "stop": {
                server.log.info({ callId, streamSid }, "Media stream stopped");
                if (callId) {
                  const session = callSessionManager.getSession(callId);
                  if (session) {
                    await session.end("telephony_stream_stopped");
                  }
                }
                break;
              }

              case "mark": {
                if (!callId) break;
                const session = callSessionManager.getSession(callId);
                if (session) {
                  const parsed = {
                    type: "mark" as const,
                    markName: data.mark?.name,
                  };
                  session.handleTelephonyMessage(parsed);
                }
                break;
              }

              default:
                server.log.debug(
                  { event: data.event },
                  "Unknown WebSocket event"
                );
            }
          } catch (err) {
            server.log.error({ err }, "Error processing WebSocket message");
          }
        });

        socket.on("close", async () => {
          server.log.info(
            { callId, streamSid },
            "WebSocket connection closed"
          );
          if (callId) {
            const session = callSessionManager.getSession(callId);
            if (session) {
              await session.end("websocket_closed");
            }
          }
        });

        socket.on("error", (err) => {
          server.log.error({ err, callId, streamSid }, "WebSocket error");
        });
      }
    );
  });
}
