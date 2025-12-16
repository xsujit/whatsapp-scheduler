# whatsapp-scheduler

A robust **Node.js backend** for **scheduling and automating WhatsApp messages**

This project uses a **Split Architecture** where the **HTTP API** and the **Background Worker** run as **separate processes** but share:

- a SQL database
- a Redis instance

---

## 1. Project Architecture

The system follows a **producer–consumer pattern** powered by **BullMQ (Redis)** to ensure reliable message scheduling and delivery.

### Components

#### API  

**File:** `src/bin/server.js`

Responsibilities:

- Handles HTTP requests
- Manages authentication
- Writes schedule definitions to the SQL database
- **Does not** send WhatsApp messages directly

#### Worker  

**File:** `src/bin/worker.js`

Responsibilities:

- Runs as a standalone process
- Maintains the WhatsApp socket connection
- Polls Redis queues for jobs
- Sends messages
- Updates message status in the database

#### Status Bridge  

Because the API and Worker are isolated processes, they communicate system state via Redis.

- Implemented as a lightweight IPC mechanism
- Allows the API to reflect Worker connectivity status

---

## 2. File Structure Overview

```text
server/
├── src/
│   ├── app.js
│   │   └── Express app setup & middleware
│   ├── bin/
│   │   ├── server.js
│   │   │   └── Entry point for HTTP API
│   │   └── worker.js
│   │       └── Entry point for Background Worker
│   ├── controllers/
│   │   └── Route logic (System, Schedule)
│   ├── db/
│   │   └── schedule.dao.js
│   │       └── Data access layer for schedules
│   ├── lib/
│   │   ├── auth.js
│   │   │   └── Better-Auth configuration
│   │   └── status.bridge.js
│   │       └── Redis-based service health bridge
│   ├── middleware/
│   │   └── Auth protection & error handling
│   ├── queues/
│   │   ├── whatsapp.queue.js
│   │   │   └── BullMQ queue definitions
│   │   └── whatsapp.worker.js
│   │       └── Job processing logic
│   ├── routes/
│   │   └── Express route definitions
│   └── services/
│       ├── schedule.service.js
│       │   └── Business logic for schedules
│       └── scheduler.service.js
│           └── Delay calculation & queueing logic
```

---

## 3. Key Technical Features

### A. The “Humanizer” Scheduler

WhatsApp aggressively bans spam-like behavior.  
To avoid this, messages are **never sent in instant bursts**.

**Code Location**  
`scheduler.service.js`  
`scheduleOneTimeJobBatch`

**Logic**

- A base delay is calculated when a batch is created
- Each message receives additional random delay

**Jitter Strategy**

- Random delay between **10–25 seconds**
- Applied **between every message**

**Result**

- 100 messages take ~30 minutes to send
- Traffic mimics real human behavior
- Significantly reduces ban risk

---

### B. The Status Bridge

The Worker owns the WhatsApp socket, but the API must display connection status to users.

**Code Location**  
`src/lib/status.bridge.js`

**Mechanism**

- Worker heartbeat runs every **5 seconds**
- Writes status + WhatsApp JID to Redis
- Redis key has a **60 second TTL**

**API Behavior**

- API reads the Redis key
- If the Worker crashes:
  - Key expires
  - API reports:
    - `Disconnected`
    - or `System Down`

---

### C. Recurring Rules

The system supports **cron-like schedules**

Example:

- “Send every day at 9:00 AM”

**Code Location**  
`queues/whatsapp.worker.js`  
(Job: `trigger-rule`)

**Flow**

- BullMQ triggers the recurring rule
- Worker wakes up
- Worker calls `scheduleService`
- A new **one-time batch** is created for that day
- Messages are queued using the Humanizer delays

---

## 4. Database Schema (Inferred)

Based on `schedule.dao.js`  
(using **Kysely**)

### Tables

#### `schedule_definitions`

Purpose:

- Stores recurring rules

Key Columns:

- `id`
- `cron`
- `content`
- `is_active`

#### `scheduled_messages`

Purpose:

- Header records for planned or sent batches

Key Columns:

- `id`
- `content`
- `scheduled_at`
- `definition_id`

#### `scheduled_message_items`

Purpose:

- Individual message targets

Key Columns:

- `id`
- `scheduled_message_id`
- `group_jid`
- `status`
  - `PENDING`
  - `SENT`
  - `FAILED`

---

## 5. Setup & Commands

### Prerequisites

- Node.js **v18+**
- Redis  
  (Required for BullMQ)
- Database:
  - PostgreSQL  
  - or SQLite

---

### Environment Variables

Create a `.env` file:

```env
PORT=3000
config_CLIENT_ORIGIN=http://localhost:5173
config_TIMEZONE=Europe/London
NODE_ENV=development
```

---

### Running the System

You **must run two processes**  
for the backend to function correctly.

#### Terminal 1 — API

```bash
node src/bin/server.js
```

Responsibilities:

- Starts Express on port 3000
- Handles UI requests
- Initializes database schema

#### Terminal 2 — Worker

```bash
node src/bin/worker.js
```

Responsibilities:

- Connects to WhatsApp
- Processes BullMQ jobs
- Updates message status
- Maintains heartbeat for system health

---

## 6. Critical Logic Flow  

### Sending a Message

1. **Request**
   - User `POST`s to `/api/schedule`
   - Payload includes:
     - message content
     - list of group JIDs

2. **Service Layer**
   - `schedule.service.js`:
     - Creates a batch header
     - Creates individual message items
     - All marked as `PENDING`

3. **Scheduler**
   - `scheduler.service.js` iterates through items

   Example delays:

   - Item 1  
     Delay: `0s`

   - Item 2  
     Delay: `15s` (random)

   - Item 3  
     Delay: `38s` (previous + random)

4. **Queue**
   - Jobs are pushed to Redis via BullMQ

5. **Worker**
   - Detects ready jobs
   - Executes message sending

6. **Execution Safety**

   - Checks idempotency  
     (skip if already SENT)
   - Sends message via WhatsApp socket
   - Updates:
     - `scheduled_message_items.status = SENT`

---
