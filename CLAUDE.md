# XAI Calling - AI-Powered Outbound Calling Platform

## Project Structure
Turborepo monorepo with pnpm workspaces.

- `apps/web` — Next.js 14 (App Router) frontend dashboard
- `apps/server` — Fastify backend + WebSocket bridge + BullMQ workers
- `packages/database` — Prisma schema + client
- `packages/shared` — Shared types, zod schemas, constants
- `packages/queue` — BullMQ queue definitions

## Setup
```bash
pnpm install
docker compose up -d          # PostgreSQL + Redis
pnpm db:generate              # Generate Prisma client
pnpm db:push                  # Push schema to database
pnpm dev                      # Start all apps
```

## Key Commands
- `pnpm dev` — Start frontend (port 3000) + backend (port 3001)
- `pnpm build` — Build all packages and apps
- `pnpm typecheck` — Run TypeScript checks across all packages
- `pnpm db:studio` — Open Prisma Studio

## Architecture
```
Phone (PSTN) ←→ Twilio/Telnyx ←→ WebSocket ←→ Bridge Server ←→ WebSocket ←→ xAI Voice API
```

## Environment
Copy `.env.example` to `.env` and fill in values. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `XAI_API_KEY` — Default xAI API key (customers bring their own)
- `ENCRYPTION_KEY` — For encrypting stored API keys (hex, 32 bytes)

## Tech Stack
- Fastify + @fastify/websocket for server
- Next.js 14 + Tailwind CSS + shadcn/ui for frontend
- PostgreSQL + Prisma for database
- Redis + BullMQ for job queues
- xAI Grok Voice API (grok-voice-latest) for AI voice
- Twilio/Telnyx for telephony (abstracted provider layer)
