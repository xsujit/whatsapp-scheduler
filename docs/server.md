# 🛠️ Server Setup and Deployment Guide

This document contains a structured compilation of essential administrative commands for initial server setup, including security, dependency installation, firewall configuration, Caddy web server setup, and PM2 process management.

---

## 1. Core Server Administration and Security

These commands handle the initial connection, user setup, system updates, and basic maintenance.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **SSH Connection** | `ssh -i ~/.ssh/id_ed25519 dev@YOUR_SERVER_IP` | **Connects** to your server using the private key specified (`-i`) to authenticate as the non-root user (`dev`). |
| **Server Update** | `sudo apt update && sudo apt upgrade -y` | **Fetches** the latest package information (`apt update`) and then **updates** all installed software to their newest versions (`apt upgrade -y`). |
| **Security** | `adduser dev` and `usermod -aG sudo dev` | **Creates** a secure non-root user account (`dev`) and then **grants** them administrative privileges (`sudo`). |
| **Server Maint.** | `sudo reboot` | **Restarts** the server immediately, essential after kernel or core library updates. |

---

## 2. Dependencies and Node.js Installation

Steps to install the necessary utilities and the Node.js runtime environment.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Dependencies** | `sudo apt install curl -y` | **Installs** the `curl` utility, which is required to fetch the NodeSource setup script. |
| **Add Repository** | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo bash -` | **Downloads** the official NodeSource script for version 22.x and executes it to add the repository to your system. |
| **Install Node** | `sudo apt-get install -y nodejs` | **Installs** the Node.js runtime and the npm package manager from the newly added repository. |
| **Verification** | `node -v` and `npm -v` | **Checks and confirms** that both Node.js and npm were successfully installed by displaying their version numbers. |

---

## 3. Configuring the Firewall (UFW)

Commands to set up and enable the Uncomplicated Firewall (UFW) to control network access.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Allow SSH** | `sudo ufw allow OpenSSH` | **Ensures** SSH access (typically port 22) is allowed before enabling the firewall, preventing accidental lockouts. |
| **Allow HTTP/S** | `sudo ufw allow 80/tcp` and `sudo ufw allow 443/tcp` | **Opens** ports 80 (HTTP) and 443 (HTTPS) for web traffic, necessary for the Caddy web server. |
| **Enable Firewall** | `sudo ufw enable` | **Activates** the firewall, applying the configured rules (you must type `y` to confirm). |
| **Check Status** | `sudo ufw status verbose` | **Displays** the current firewall status and the list of allowed ports to verify the configuration. |

---

## 4. Caddy Web Server Configuration

Commands for installing Caddy and managing its reverse proxy and TLS configuration.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Install Caddy** | (The full sequence of `apt install` and `curl` commands) | **Installs** Caddy using the official repository for the latest version. |
| **Edit Config** | `sudo nano /etc/caddy/Caddyfile` | **Opens** the main Caddy configuration file for editing domains and reverse proxy settings. |
| **Check Config** | `sudo caddy validate` | **Validates** the syntax of the edited `Caddyfile` before applying it. |
| **Apply Changes** | `sudo systemctl reload caddy` | **Applies** the new Caddy configuration immediately and gracefully. |

---

## 5. PM2 Process Management

Commands for installing and managing Node.js applications with the PM2 production process manager.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Install PM2** | `sudo npm install pm2 -g` | **Installs** the PM2 process manager globally to run Node.js apps reliably. |
| **Setup Startup** | `pm2 startup` and the resulting `sudo` command | **Configures** a systemd service to automatically start PM2 and all managed apps on server boot. |
| **Start App** | `pm2 start ecosystem.config.cjs` | **Launches** your application(s) based on the definitions in your ecosystem configuration file. |
| **Check Status** | `pm2 list` | **Displays** the status, memory, and CPU usage of all applications managed by PM2. |
| **Save Apps** | `pm2 save` | **Persists** the currently running PM2 apps, ensuring they are automatically restarted on reboot. |
| **Stop App** | `pm2 stop my-portfolio` or `pm2 stop 0` | **Stops** the running application process by name or ID. |
| **Restart App** | `pm2 restart my-portfolio` | **Restarts** the application process using its existing configuration. |
| **Graceful Reload** | `pm2 reload my-portfolio` | **Performs** a zero-downtime restart, loading the new code without interrupting active connections. |