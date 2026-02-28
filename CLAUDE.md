# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A WhatsApp message scheduling application with a **split-process architecture**: an HTTP API and a background Worker run as separate Node.js processes, sharing a SQLite database and a Redis (DragonflyDB) instance via BullMQ.

## Commands

### Server (run from `server/`)

```bash
npm run dev          # Run API + Worker together (nodemon, color-coded output)
npm run dev:api      # Run only the API (nodemon)
npm run dev:worker   # Run only the Worker (nodemon)
npm run start        # Production: run both processes with node
npm run lint         # Lint server source
```

### Client (run from `client/`)

```bash
npm run dev          # Vite dev server
npm run build        # Build to client/dist/ (served by the API in production)
npm run lint         # Lint client source
```

### Infrastructure

```bash
# Start DragonflyDB (Redis-compatible) via Docker
docker compose up -d   # from server/
```

### Production (PM2)

```bash
pm2 start ecosystem.config.cjs   # from server/
pm2 logs
```

## Architecture

### Split Process Design

The system runs **two separate Node.js processes**:

- **API** (`src/bin/server.js`): Express 5 server. Handles HTTP, auth, writes schedules to DB, does NOT send WhatsApp messages.
- **Worker** (`src/bin/worker.js`): Owns the WhatsApp socket (Baileys). Polls BullMQ for jobs and sends messages.

They communicate via:
- **SQLite** (shared DB for schedules, status)
- **Redis/DragonflyDB** (BullMQ job queue + Status Bridge)

### Status Bridge (`src/lib/status.bridge.js`)

Because the API and Worker are isolated, the Worker publishes heartbeats to Redis every ~5 seconds under the key `system:whatsapp:status` with a **60-second TTL**. If the Worker crashes, the key expires and the API reports the system as down.

### Humanizer Scheduler (`src/services/scheduler.service.js`)

Messages are **never sent in instant bursts** to avoid WhatsApp bans. Each message in a batch receives an additional random delay of **10–25 seconds** stacked cumulatively — 100 messages take ~30 minutes.

### Recurring Rules

Cron-based repeating schedules use BullMQ Job Schedulers. When a `trigger-rule` job fires, the Worker calls `scheduleService.createSchedule()` to create a new one-time batch for that day, which then goes through the humanizer.

## Server Key Patterns

### Import Aliases

The server uses Node.js `imports` aliases (defined in `server/package.json`):

```js
import { CONFIG } from '#config';
import { db } from '#db';
import { AppError } from '#lib/errors/AppError';
import { asyncHandler } from '#utils/asyncHandler';
// etc: #controllers/*, #db/*, #lib/*, #middleware/*, #queues/*, #routes/*, #services/*, #types/*, #utils/*
```

### Error Handling Flow

```
Controller (asyncHandler) → Service (throws AppError) → globalErrorHandler
```

- **Controllers**: Always wrap with `asyncHandler`. Never manually catch errors or send error responses.
- **Services**: Throw `AppError` for operational failures (4xx). Throw standard `Error` for system failures (5xx).
- **`AppError`**: `new AppError(message, statusCode)` — auto-sets `status` to `'fail'` (4xx) or `'error'` (5xx).
- **Global handler** (`src/middleware/error.middleware.js`): Catches everything, maps `ZodError` and `APIError` (Better-Auth), returns consistent JSON.

### Date/Time

Use **Luxon** (`DateTime`) for all date logic. Use `CONFIG.TIMEZONE` for zone-aware operations. Raw JS `Date` is only acceptable when writing to the DB.

### Validation

Use **Zod** schemas (defined in `src/lib/validation/`) for request body validation. The global error handler automatically formats `ZodError` into clean API responses.

### Logging

Use **Pino** logger (`src/lib/logger.js`) throughout. Create child loggers for scoped context:

```js
const jobLogger = logger.child({ jobId: job.id });
jobLogger.info({ itemId }, 'Processing...');
```

### Worker Factory Pattern

`src/queues/whatsapp.worker.js` exports `createWorker({ whatsappService, scheduleService, scheduleDAO })` — a factory function that accepts injected dependencies to avoid circular imports.

## Environment Variables (`server/.env`)

| Variable | Description |
|---|---|
| `BETTER_AUTH_URL` | Base URL for Better-Auth |
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `NODE_ENV` | `dev` / `production` |
| `ALLOW_REGISTRATION` | `true` / `false` — gates sign-up endpoint |
| `APP_TIMEZONE` | IANA timezone (e.g. `Europe/Amsterdam`) |
| `CLIENT_ORIGIN` | CORS origin for the frontend |
| `LOCALHOST` | Bind address |
| `PORT` | API port |
| `DROP_SCHEDULED_MESSAGES` | `true` drops and recreates schedule tables on startup |
| `REDIS_PORT` | DragonflyDB port (default `6379`) |
| `REDIS_PASSWORD` | DragonflyDB password |

## Database

- **SQLite** via `better-sqlite3` + **Kysely** ORM (WAL mode, foreign keys enabled)
- Schema is auto-created/verified on API startup via `initializeSchema()` in `src/db/index.js`
- DB file lives at `server/app.db`
- Tables: `schedule_definitions`, `scheduled_messages`, `scheduled_message_items`, `groups`, `collections`, `collection_items`
- Message statuses (from `src/types/enums.js`): `PENDING`, `IN_PROGRESS`, `SENT`, `FAILED`, `EXPIRED`, `DELETED`

## Client

- **React 19**, Vite, **TailwindCSS v4**, React Router v7
- Auth via `better-auth` client (`src/lib/auth-client.js`)
- API calls go through `src/lib/api.js`
- Zod schemas in `src/lib/schemas.js`
- In production, the built client (`client/dist/`) is served as static files by the API

## Production Infrastructure

- **Server**: Hetzner CAX11 (2 vCPU, 4 GB RAM, Ubuntu)
- **Process Manager**: PM2 (`ecosystem.config.cjs`) — API gets 300MB limit, Worker gets 512MB
- **Redis**: DragonflyDB in Docker (configured in `server/docker-compose.yml`)
- Docs for deployment: `docs/server.md`, `docs/pm2.md`, `docs/dragonfly-db.md`
