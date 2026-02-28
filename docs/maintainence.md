# 🧰 Server Maintenance Guide

This document lists common commands used for
routine server maintenance,
monitoring, updates, and security checks.

All commands are safe to run on a production server

---

## Docker (current deployment)

All manual npm steps below are replaced by a single command:

```bash
git pull
docker compose build
docker compose up -d
```

`docker compose build` runs all three Dockerfile stages internally:

| Traditional step | Handled by |
| :--- | :--- |
| `npm i` (client) | `client-builder` stage |
| `npm run build` (client) | `client-builder` stage |
| `rm -rf node_modules` | Not needed — each stage is isolated |
| `npm install --omit=dev` (server) | `server-deps` stage |
| `npm run start` | `docker compose up -d` |

The Better-Auth migration (`npx @better-auth/cli@latest migrate`) is only
needed once on a fresh database. See `docs/docker.md` for full deployment steps.

---

## NPM (legacy — PM2 deployment)

### CLIENT

npm i
npm run build
rm -rf node_modules
npm install --omit=dev

### SERVER

npx @better-auth/cli@latest migrate
npm install --omit=dev
npm run start

---

## 📊 System Monitoring

### 🔍 View Real‑Time Resource Usage

```bash
htop    # Interactive process viewer (CPU, memory, load)
```

Use this to:

- Identify high CPU or memory usage
- Inspect running processes
- Kill misbehaving services safely

---

### 🌐 Inspect Open Ports and Services

```bash
sudo ss -tulpn
```

Explanation:

- `-t` → TCP sockets
- `-u` → UDP sockets
- `-l` → Listening services
- `-p` → Process using the port
- `-n` → Numeric output (no DNS lookup)

This helps verify:

- Which services are exposed
- Whether unexpected ports are open

---

## 🔄 System Updates

### 📦 Update and Upgrade Packages

```bash
sudo apt update && sudo apt upgrade -y
```

- Refreshes package metadata
- Installs available security and bug‑fix updates
- `-y` auto‑confirms prompts

Recommended to run regularly
(weekly or bi‑weekly).

---

## ⏱️ Cron Jobs Inspection

Cron jobs are scheduled tasks
that run automatically in the background.

### 🔎 Check Root User Crontabs

```bash
sudo ls -la /var/spool/cron/crontabs/   # List user crontab files
sudo cat /etc/crontab                   # View system‑wide crontab
sudo ls -la /etc/cron.d/                # List additional cron definitions
```

Use this section to:

- Audit scheduled jobs
- Detect unexpected or malicious tasks
- Verify backups and maintenance scripts

---

## 🔥 Firewall (UFW) Status Verification

### 📜 View Firewall Rules and Status

```bash
sudo ufw status verbose
```

Sample output interpretation:

- **Status:** active → Firewall is enabled
- **Logging:** on (low) → Basic traffic logging
- **Default policy:**
  - Deny incoming
  - Allow outgoing

### ✅ Allowed Incoming Rules

```text
22/tcp   (OpenSSH)  → SSH access
80/tcp              → HTTP traffic
443/tcp             → HTTPS traffic
```

IPv6 rules mirror IPv4 rules,
ensuring consistent protection.

This confirms:

- Only essential ports are exposed
- SSH and web traffic are permitted
- All other inbound traffic is blocked

---

✅ End of document.
