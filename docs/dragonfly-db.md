# 🐳 DragonflyDB Docker Management Commands

This document lists essential Docker Compose and Docker commands for managing a DragonflyDB instance, including startup, shutdown, viewing logs, and inspecting data volumes.

---

## 💾 DragonflyDB Persistence Location

DragonflyDB, when run in its official Docker image, uses the following directory inside the container for storing data snapshots.

* **Container Path for Persistence (Default)**
  The DragonflyDB container is configured to save snapshot files (like `dump.rdb`) to this directory by default.
  `/data`

> **Note:** To ensure data persists across container restarts and removal, you must use a **Docker Volume** or **Bind Mount** to map this `/data` container path to a directory or named volume on your host machine. For example, `volumes: - ./my_data_dir:/data` in your `docker-compose.yml`.

---

## 🛠️ Docker Compose & Container Management

### 🔗 Documentation References

These links provide detailed information on setting up and managing your DragonflyDB instance.

* **Getting Started with Docker Compose:**
  `https://www.dragonflydb.io/docs/getting-started/docker-compose`
* **Managing DragonflyDB Flags:**
  `https://www.dragonflydb.io/docs/managing-dragonfly/flags`
* **Managing DragonflyDB Backups:**
  `https://www.dragonflydb.io/docs/managing-dragonfly/backups`

### 🛑 Standard Shutdown

Stops and removes containers and networks defined in the `docker-compose.yml` file. **Crucially, it preserves any named volumes**, meaning your persistent data is safe.

`docker compose down`

### 🗑️ Shutdown and Cleanup (Remove Data)

Stops and removes containers, networks, and all named **volumes** (`-v`) defined in the `docker-compose.yml` file. **Use this command with caution** as it deletes the persistent data.

`docker compose down -v`

### 🚀 Start Service

Creates and starts the services defined in the `docker-compose.yml` file in **detached** mode (`-d`).

`docker compose up -d`

### 🪵 View Container Logs

Displays the real-time or historical output logs from the container named `whatsapp_scheduler_db`.

`docker logs whatsapp_scheduler_db`

### 🔍 Inspect Data Volume

Executes the `ls -lh /data` command **inside** the running container `whatsapp_scheduler_db` to list the contents of the container's persistence directory in long, human-readable format.

`docker exec -it whatsapp_scheduler_db ls -lh /data`