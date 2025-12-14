# 🐳 DragonflyDB Docker Management Commands

This document lists essential **Docker Compose** and **Docker** commands for managing a **DragonflyDB** instance.

It covers:

- Startup and shutdown
- Viewing logs
- Inspecting data volumes
- Cleaning up containers and images

---

## 💾 DragonflyDB Persistence Location

When using the **official DragonflyDB Docker image**, data snapshots (for example `dump.dfs`) are stored inside the container at the path below.

### 📂 Container Persistence Path (Default)

```
/data
```

This directory is used automatically by DragonflyDB for saving snapshot and persistence files.

> ⚠️ **Important**\
> To keep data across container restarts or removal, you **must** map this path to the host system.
>
> Use either:
>
> - a **Docker named volume**, or
> - a **bind mount**

### 📌 Example (Bind Mount)

```yaml
volumes:
  - ./my_data_dir:/data
```

This ensures that data survives container shutdowns and recreations.

---

## 🛠️ Docker Compose & Container Management

### 🔗 Official Documentation

Use the links below for deeper configuration details.

- **Docker Compose Setup**\
  [https://www.dragonflydb.io/docs/getting-started/docker-compose](https://www.dragonflydb.io/docs/getting-started/docker-compose)

- **DragonflyDB Flags**\
  [https://www.dragonflydb.io/docs/managing-dragonfly/flags](https://www.dragonflydb.io/docs/managing-dragonfly/flags)

- **Backups & Snapshots**\
  [https://www.dragonflydb.io/docs/managing-dragonfly/backups](https://www.dragonflydb.io/docs/managing-dragonfly/backups)

---

## 🛑 Standard Shutdown

Stops and removes containers and networks created by `docker-compose.yml`.

Named volumes are **preserved**, so persistent data remains safe.

```bash
docker compose down
```

---

## 🗑️ Shutdown and Cleanup (Remove Data)

Stops containers and removes:

- containers
- networks
- **named volumes**

⚠️ **Warning**\
This command permanently deletes all persistent data.

```bash
docker compose down -v
```

---

## 🚀 Start Service

Creates and starts all services defined in `docker-compose.yml`.

Runs in **detached mode**.

```bash
docker compose up -d
```

---

## 🪵 View Container Logs

Displays logs for the container named `whatsapp_scheduler_db`.

```bash
docker logs whatsapp_scheduler_db
```

---

## 🔍 Inspect Data Volume

Lists the contents of the `/data` directory inside the running container.

Shows file sizes in a human‑readable format.

```bash
docker exec -it whatsapp_scheduler_db ls -lh /data
```

---

## 🧹 General Docker Cleanup Commands

### Remove Stopped Containers

```bash
docker container prune
```

---

### List Docker Images

```bash
docker images
```

---

### Remove a Specific Image

Replace the image ID as needed.

```bash
docker rmi d4aaab6242e0
```

---

✅ End of document.
