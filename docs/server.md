# 🛠️ Server Setup and Deployment Guide

This document contains a structured compilation of essential administrative commands
for initial server setup.

It includes:

- Security hardening
- Dependency installation
- Firewall configuration
- Web server setup
- Process management

---

## 1. Core Server Administration and Security

These commands handle the initial connection, user setup,
system updates, and basic maintenance.

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **SSH Connection** | `ssh -i ~/.ssh/id_ed25519 dev@YOUR_SERVER_IP` | **Connects** to the server using an SSH key and the non-root user `dev`. |
| **Server Update** | `sudo apt update && sudo apt upgrade -y` | **Updates** package lists and upgrades all installed packages. |
| **Security** | `adduser dev` / `usermod -aG sudo dev` | **Creates** a non-root user and grants sudo privileges. |
| **Server Maint.** | `sudo reboot` | **Reboots** the server after critical updates. |

---

## 2. Dependencies and Node.js Installation

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Dependencies** | `sudo apt install curl -y` | **Installs** curl for fetching remote scripts. |
| **Add Repository** | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo bash -` | **Adds** the Node.js 22.x repository. |
| **Install Node** | `sudo apt-get install -y nodejs` | **Installs** Node.js and npm. |
| **Verification** | `node -v` / `npm -v` | **Verifies** successful installation. |

---

## 3. Configuring the Firewall (UFW)

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Allow SSH** | `sudo ufw allow OpenSSH` | **Prevents** SSH lockout when enabling UFW. |
| **Allow HTTP/S** | `sudo ufw allow 80/tcp` / `sudo ufw allow 443/tcp` | **Opens** web traffic ports. |
| **Enable Firewall** | `sudo ufw enable` | **Activates** UFW rules. |
| **Check Status** | `sudo ufw status verbose` | **Verifies** firewall rules. |

---

## 4. Caddy Web Server Configuration

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Edit Config** | `sudo nano /etc/caddy/Caddyfile` | **Edits** Caddy reverse proxy configuration. |
| **Check Config** | `sudo caddy validate` | **Validates** Caddyfile syntax. |
| **Apply Changes** | `sudo systemctl reload caddy` | **Reloads** Caddy without downtime. |

---

## 5. PM2 Process Management

| Context | Command | Purpose |
| :--- | :--- | :--- |
| **Install PM2** | `sudo npm install pm2 -g` | **Installs** PM2 globally. |
| **Startup Hook** | `pm2 startup` | **Generates** system startup command. |
| **Start App** | `pm2 start ecosystem.config.cjs` | **Starts** apps via ecosystem file. |
| **Status** | `pm2 list` | **Displays** running processes. |
| **Save State** | `pm2 save` | **Persists** PM2 process list. |
| **Stop App** | `pm2 stop my-portfolio` | **Stops** the app gracefully. |
| **Restart App** | `pm2 restart my-portfolio` | **Restarts** the app. |
| **Reload App** | `pm2 reload my-portfolio` | **Reloads** app with zero downtime. |

---

## 6. Additional Security Hardening

> The commands below focus on intrusion prevention
> and SSH hardening.

### 🔒 Install and Enable Fail2Ban

```bash
sudo apt update                     # Refresh package lists
sudo apt install fail2ban -y        # Install Fail2Ban for brute‑force protection
sudo systemctl enable fail2ban      # Enable Fail2Ban on system boot
sudo systemctl start fail2ban       # Start the Fail2Ban service immediately
```

Fail2Ban monitors authentication logs
and automatically bans IPs
that show malicious behavior.

---

### 🔐 Harden SSH Configuration

```bash
sudo nano /etc/ssh/sshd_config      # Open SSH daemon configuration file
```

Inside the file, ensure the following settings:

```conf
PermitRootLogin no                  # Disable direct root SSH access
PasswordAuthentication no           # Enforce SSH key authentication only
ChallengeResponseAuthentication no  # Disable challenge-response auth
UsePAM yes                          # Keep PAM enabled for session management
```

After saving changes:

```bash
sudo systemctl restart ssh          # Apply SSH configuration changes
```

These settings significantly reduce
attack surface and brute‑force risks.

---

✅ End of document.
