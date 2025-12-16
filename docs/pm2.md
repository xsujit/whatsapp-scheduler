# 🔧 PM2 Process Management Commands

This document lists common PM2 commands used for managing Node.js applications, including starting, stopping, listing, and viewing logs.

---

## 🚀 Process Control

These commands are used to start, stop, or restart processes defined in a configuration file (`ecosystem.config.cjs`) or manage individual processes.

| Command | Description |
| :--- | :--- |
| `pm2 start ecosystem.config.cjs` | **Start** all applications defined in the specified ecosystem configuration file. |
| `pm2 stop ecosystem.config.cjs` | **Stop** all applications defined in the specified ecosystem configuration file. |
| `pm2 restart ecosystem.config.cjs` | **Restart** all applications defined in the specified ecosystem configuration file (performs a graceful reload). |
| `pm2 delete whatsapp-scheduler` | **Remove** the specific process named `whatsapp-scheduler` from the PM2 list and stop it. |
| `pm2 save` | **Save** the current list of running processes so they will be automatically started when the server reboots (persistency). |

---

## 📋 Status and Monitoring

These commands provide a quick overview and detailed, real-time status of managed processes.

| Command | Description |
| :--- | :--- |
| `pm2 list` | **Display** a table of all running processes managed by PM2, showing status, CPU, memory usage, etc. |
| `pm2 monit` | **Launch** the PM2 terminal dashboard for real-time monitoring of CPU, memory, and logs for all processes.  |

---

## 🪵 Logging and Debugging

Commands for viewing standard output and error logs from managed applications.

| Command | Description |
| :--- | :--- |
| `pm2 logs` | **Display** a real-time stream of logs (standard output and error) from all managed applications. |
| `pm2 logs --err` | **Display** only the real-time stream of **error logs** from all managed applications. |
| `pm2 logs whatsapp-scheduler --lines 100` | **Display** the last 100 lines of logs for the process named `whatsapp-scheduler`. |
| `pm2 flush` | **Clear/empty** all application log files managed by PM2. |
| `tail -f /home/dev/projects/whatsapp-scheduler/server/pm2/out-0.log \| grep --line-buffered '2025-12-11 21:36'` | A Linux/Bash command to **stream** log files (`tail -f`) and **filter** the output (`grep`) to show only lines matching a specific timestamp. *(Not a PM2 command, but useful for deep log inspection).* |

---

## 🚨 Common Debugging & Persistency Flow

A typical flow for resolving issues and ensuring the application is saved correctly.

1. **Stop and Delete** the problematic process:

    ```bash
    pm2 delete whatsapp-scheduler
    ```

2. **Start** the application again (using the configuration file):

    ```bash
    pm2 start ecosystem.config.cjs
    ```

3. **Check Logs** to ensure the application is running successfully:

    ```bash
    pm2 logs whatsapp-scheduler
    ```

4. Once the application is running successfully, **save** the new process list to ensure it persists across reboots:

    ```bash
    pm2 save
    ```
