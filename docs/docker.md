# 🐳 Docker — Feasibility Study & Implementation

This document covers the full containerization of the WhatsApp Scheduler:
the pre-implementation feasibility study, the code changes required, the
architecture of the final Docker setup, and day-to-day operational commands.

---

## Part 1 — Feasibility Study

### Goal

The app runs on a shared Hetzner VPS alongside a Django application. The goal
is to containerize the Node.js app so that a compromise cannot propagate to
other apps on the host.

---

### Finding 1 — WhatsApp Session Storage (Most Critical)

`server/src/services/whatsapp.service.js` uses Baileys multi-file auth state:

```js
const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_PATH);
```

`CONFIG.SESSION_PATH` resolves to `server/baileys_session/` (set in
`server/src/config/index.js`). This directory holds WhatsApp credentials as
multiple JSON files. **If it is deleted or corrupted, the account must
re-authenticate via a fresh QR scan.**

In Docker: must be a persistent named volume (`wa-session`) mounted at
`/app/server/baileys_session`.

---

### Finding 2 — SQLite Database (Relative Path)

`server/src/db/index.js`:

```js
const rawDb = new Database('app.db');
```

This opens `app.db` relative to the working directory (`server/`). Both the API
and the Worker write to it. In Docker, named volumes can only mount directories,
not single files. The fix is to introduce a `DB_PATH` env var and mount a named
volume (`wa-db`) at `/app/server/data`; Docker sets `DB_PATH=data/app.db`.

---

### Finding 3 — Redis Host Is Hardcoded (Blocking Bug for Docker)

`server/src/queues/connection.js`:

```js
const connectionOptions = {
    host: CONFIG.LOCALHOST,  // same var as the API bind address
    ...
};
```

`CONFIG.LOCALHOST` (`127.0.0.1`) is used for **two different purposes**: the
Express bind address and the Redis connection host. In Docker, `127.0.0.1`
inside a container refers to the container itself — not the DragonflyDB
container. These must be separated:

- API bind address → `0.0.0.0` (Docker handles external port mapping)
- Redis host → the Docker service name (`dragonfly`)

Fix: add a dedicated `REDIS_HOST` env var that falls back to `LOCALHOST` for
backwards compatibility with the PM2 / dev workflow.

---

### Finding 4 — API Bind Address Must Be `0.0.0.0`

Currently `LOCALHOST=127.0.0.1`. Inside a container, this means the Express
server only listens on the container's loopback — Docker cannot map the port
out to the host. The Docker env must set `LOCALHOST=0.0.0.0`.

---

### Finding 5 — Client Static Files (Multi-Stage Build Required)

`CONFIG.CLIENT_DIST_PATH` resolves to `client/dist/`. The API serves the
pre-built React app from this path. The `dist/` directory must exist inside the
production image, which means the client must be built during the Docker build.
A multi-stage Dockerfile handles this cleanly.

---

### Finding 6 — DragonflyDB Already in Docker (Half-Dockerized)

The existing `server/docker-compose.yml` ran DragonflyDB alone, exposing
`127.0.0.1:6379:6379` so PM2 processes on the host could reach it. After full
Dockerization, DragonflyDB moves entirely inside the private Docker network —
no host port needed.

---

### Finding 7 — Native Addon on ARM64

`better-sqlite3` is a native C++ addon compiled by `node-gyp`. The Hetzner
CAX11 is ARM64 (Ampere). Pre-compiled binaries from a macOS or x86 dev machine
will not work. The `npm ci` must run **inside** the ARM64 container, handled
naturally by building the image on the server itself.

---

### Finding 8 — No Port Conflicts With the Other App

The other app (Django/Gunicorn/Nginx) uses `127.0.0.1:8002`. This app's API
is exposed on `127.0.0.1:3001`. No conflict.

---

### Pros

| Pro | Detail |
| :--- | :--- |
| **Security isolation** | A compromised app is contained — cannot access other apps' filesystems, processes, or internal networks |
| **Network isolation** | DragonflyDB is no longer exposed on `127.0.0.1:6379` — invisible outside `wa-scheduler-net` |
| **No dependency conflicts** | Node.js version and packages locked inside the image |
| **Resource limits enforced** | `mem_limit` in Docker actually throttles memory; PM2's `max_memory_restart` only restarts after the fact |
| **PM2 removed** | Docker handles auto-restart, health checks, and process isolation natively |
| **Reproducible deployments** | Build once, ship the image — no `npm install` on the server |
| **Independent restarts** | API crash does not bring down the Worker and vice versa |
| **Clean migration** | The existing `docker-compose.yml` (DragonflyDB only) is superseded by a unified `compose.yaml` for the whole stack |

---

### Cons / Complications

| Con | Mitigation |
| :--- | :--- |
| **Session volume is the single point of auth failure** — if `wa-session` is deleted, re-scan QR | Treat it like a database backup; document clearly |
| **QR Code scan workflow changes** — appears in container logs, not a terminal | `docker logs -f wa-scheduler-worker`; not harder, just different |
| **Redis host requires a code change** — `connection.js` uses `CONFIG.LOCALHOST` for Redis | Add `REDIS_HOST` env var; two-line isolated change |
| **`better-sqlite3` native compilation** — must compile inside ARM64 container | Multi-stage build on the server; `npm ci` runs in the Dockerfile |
| **SQLite shared by two containers** — both mount the same `wa-db` volume | SQLite WAL mode is designed for this; no regression from current behaviour |
| **Build step added to deploy flow** — must `docker compose build` before up | Replaces `npm install && pm2 start`; `docker compose up --build` handles it in one command |

---

### PM2 → Docker Mapping

| Current (PM2 / `ecosystem.config.cjs`) | Docker (`compose.yaml`) |
| :--- | :--- |
| `node src/bin/server.js` | `api` service, `command: ["node", "src/bin/server.js"]` |
| `node src/bin/worker.js` | `worker` service, `command: ["node", "src/bin/worker.js"]` |
| `max_memory_restart: 300M` | `mem_limit: 300m` |
| `max_memory_restart: 512M` | `mem_limit: 512m` |
| `restart_delay: 3000` + PM2 startup hook | `restart: unless-stopped` + Docker daemon on boot |

One Docker image, two containers — the canonical pattern for this architecture.

---

### Feasibility Verdict

**Feasible and recommended.** The architecture maps 1:1 to Docker's
two-service pattern. The only non-trivial item is separating `REDIS_HOST` from
`LOCALHOST` in `connection.js` — a change of two lines. Everything else is
configuration, not code. The security goal is fully achieved.

---

## Part 2 — Implementation

### Files Changed

#### `server/src/config/index.js`

Added two new env vars with backwards-compatible defaults:

```js
REDIS_HOST: process.env.REDIS_HOST || process.env.LOCALHOST || '127.0.0.1',
DB_PATH: process.env.DB_PATH || 'app.db',
```

The fallback chain for `REDIS_HOST` ensures that the existing `server/.env`
and PM2 workflow continue to work without any changes.

---

#### `server/src/queues/connection.js`

```js
// Before
host: CONFIG.LOCALHOST,

// After
host: CONFIG.REDIS_HOST,
```

---

#### `server/src/db/index.js`

```js
// Before
const rawDb = new Database('app.db');

// After (added CONFIG import)
import { CONFIG } from '#config';
const rawDb = new Database(CONFIG.DB_PATH);
```

---

#### `server/docker-compose.yml` — Deleted

DragonflyDB config is superseded by the root-level `compose.yaml`.

---

### Files Created

#### `Dockerfile` (repo root)

Three build stages:

| Stage | Base | Purpose |
| :--- | :--- | :--- |
| `client-builder` | `node:24-alpine3.23` | Install client deps, run `npm run build`, produce `client/dist/` |
| `server-deps` | `node:24-alpine3.23` + `python3 make g++` | Compile `better-sqlite3` native addon, run `npm ci --omit=dev` |
| `production` | `node:24-alpine3.23` | Minimal image — no build tools. Copies source, compiled `node_modules`, and built `client/dist/`. Runs as non-root user `nodejs` (uid 1001) |

The `production` stage pre-creates `/app/server/baileys_session` and
`/app/server/data` with correct ownership so volume mounts inherit the right
permissions on first run.

No `CMD` at the image level — each service defines its own `command:` in
`compose.yaml`.

---

#### `compose.yaml` (repo root)

Full-stack definition. A YAML anchor (`x-app-common`) shares common config
between `api` and `worker` to avoid repetition.

**Services:**

| Service | Container | Ports | Volumes | Memory |
| :--- | :--- | :--- | :--- | :--- |
| `dragonfly` | `wa-scheduler-dragonfly` | None (internal only) | `wa-dragonfly:/data` | — |
| `api` | `wa-scheduler-api` | `127.0.0.1:3001:3001` | `wa-db:/app/server/data` | 300 MB |
| `worker` | `wa-scheduler-worker` | None | `wa-db:/app/server/data`, `wa-session:/app/server/baileys_session` | 512 MB |

**Environment overrides injected by compose (not in `.env`):**

| Variable | Value | Reason |
| :--- | :--- | :--- |
| `LOCALHOST` | `0.0.0.0` | Express must listen on all interfaces inside the container |
| `REDIS_HOST` | `dragonfly` | Docker service name, not `127.0.0.1` |
| `DB_PATH` | `data/app.db` | Points into the `wa-db` named volume directory |

**Named volumes:**

| Volume | Mounted at | Contents |
| :--- | :--- | :--- |
| `wa-db` | `/app/server/data` | `app.db` — SQLite database |
| `wa-session` | `/app/server/baileys_session` | Baileys WhatsApp credentials |
| `wa-dragonfly` | `/data` | DragonflyDB snapshots |

**Security hardening on `api` and `worker`:**

```yaml
cap_drop: [ALL]
security_opt: [no-new-privileges:true]
```

---

#### `.dockerignore` (repo root)

Excludes: `node_modules`, `.env`, DB files (`app.db*`), `baileys_session/`,
`client/dist/`, `.git`, `docs/`, and Markdown files. All of these are either
rebuilt inside Docker, managed as volumes, or should never be included in the
image.

---

#### `.env.example` (repo root)

Template for the root `.env` file that Docker reads. Copy and fill in secrets
before first deploy:

```bash
cp .env.example .env
```

The variables `LOCALHOST`, `REDIS_HOST`, and `DB_PATH` are set by `compose.yaml`
as environment overrides and do not need to be changed in `.env`.

---

### Network Architecture

```
Host (Hetzner CAX11)
│
├── Caddy (host, port 443/80) — TLS termination
│     ├── your-domain.com  → 127.0.0.1:3001   (this app)
│     └── other-app.com   → 127.0.0.1:8002   (Django/Nginx)
│
├── Docker network: wa-scheduler-net (private bridge)
│     ├── wa-scheduler-api      ← port 127.0.0.1:3001 exposed to host
│     ├── wa-scheduler-worker   ← no host ports
│     └── wa-scheduler-dragonfly ← no host ports (was 127.0.0.1:6379)
│
└── Docker network: laravel-production (private bridge — other app, no overlap)
      ├── nginx
      ├── gunicorn
      └── postgres
```

---

## Part 3 — Operations

### First-Time Deploy

```bash
# 1. Copy env template and fill in secrets
cp .env.example .env

# 2. Build the image
docker compose build

# 3. Start all services
docker compose up -d
```

#### Step 4 — Create Better-Auth tables (one-time only)

Better-Auth manages its own tables (`user`, `session`, `account`) separately
from the app schema. They must be created before the first sign-in or sign-up,
otherwise the API returns a 500 (`no such table: user`).

```bash
docker compose exec api npx @better-auth/cli@latest migrate
```

When prompted, confirm to apply the migration. This only needs to be run once
per fresh database (i.e. after `docker compose down -v` or on a new server).

#### Step 5 — Scan the WhatsApp QR code

The QR code is printed as ASCII art directly to the Worker's stdout, mixed in
between the JSON log lines. Watch the live logs:

```bash
docker logs -f wa-scheduler-worker
```

Wait for this line to appear:

```text
"[WA] Action Required: Scan QR Code"
```

The ASCII QR block prints immediately below it. Open WhatsApp on your phone →
Linked Devices → Link a Device, then scan. Once authenticated the Worker logs:

```text
"[WA] WhatsApp Client Connected"
```

The session is then persisted to the `wa-session` volume and survives container
restarts — you will not need to scan again unless the session is explicitly
deleted.

---

### Subsequent Deploys (After Code Changes)

```bash
docker compose build
docker compose up -d
```

---

### Status & Logs

| Command | Purpose |
| :--- | :--- |
| `docker compose ps` | Check all container statuses |
| `docker logs -f wa-scheduler-api` | Follow API logs |
| `docker logs -f wa-scheduler-worker` | Follow Worker logs (QR code appears here) |
| `docker logs -f wa-scheduler-dragonfly` | Follow DragonflyDB logs |

---

### Lifecycle

| Command | Purpose |
| :--- | :--- |
| `docker compose up -d` | Start all services (detached) |
| `docker compose down` | Stop and remove containers; **volumes are preserved** |
| `docker compose down -v` | Stop and remove containers **and volumes** — ⚠️ destroys DB and session |
| `docker compose restart api` | Restart only the API container |
| `docker compose restart worker` | Restart only the Worker container |

---

### Volume Backup (Recommended)

Before destructive operations, back up the named volumes:

```bash
# Backup SQLite DB
docker run --rm -v wa-db:/data -v $(pwd):/backup alpine \
  tar czf /backup/wa-db-backup.tar.gz -C /data .

# Backup WhatsApp session
docker run --rm -v wa-session:/data -v $(pwd):/backup alpine \
  tar czf /backup/wa-session-backup.tar.gz -C /data .
```

---

### Troubleshooting

#### Worker loops with `405 Connection Failure` and never shows QR

WhatsApp periodically updates its Web client protocol. If the version hardcoded
in Baileys is out of date, WhatsApp rejects the connection before issuing a QR
code. The fix is to call `fetchLatestBaileysVersion()` so Baileys fetches the
current accepted version at startup.

In `server/src/services/whatsapp.service.js`:

```js
// Import
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';

// In initialize(), before makeWASocket():
const { version } = await fetchLatestBaileysVersion();

waSocket = makeWASocket({
    version,   // ← add this
    auth: state,
    ...
});
```

After the change, rebuild the worker image and restart:

```bash
docker compose build worker
docker compose restart worker
```

#### Sign-up / sign-in returns 500

Run the Better-Auth migration (Step 4 above). The most common cause is that the
`user` table does not exist yet in a fresh database.

```bash
docker compose exec api npx @better-auth/cli@latest migrate
```

---

### Caddy Config (Host)

Add a reverse proxy entry for this app in your Caddyfile:

```caddyfile
your-domain.com {
    reverse_proxy localhost:3001
}
```

This follows the same pattern as the other app's `localhost:8002` entry.

---

✅ End of document.
