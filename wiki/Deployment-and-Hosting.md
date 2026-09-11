# Local & VPS Hosting Guide

This guide covers production deployment and self-hosting for HELIX RSS on **Local Machines** and **Virtual Private Servers (VPS)** across Linux, macOS, and Windows.

```mermaid
flowchart TD
    subgraph InternetTraffic [Incoming Traffic]
        Client([Browser / Discord])
    end

    subgraph ReverseProxy [Built-in Automatic HTTPS]
        Caddy[Integrated Caddy Supervisor]
    end

    subgraph ServiceCore [HELIX RSS Core]
        Bot[Discord Bot & HTTP Server\n(127.0.0.1:3131)]
        DB[(SQLite Persistence\n./data/helix-rss.db)]
        Scheduler[Feed Polling & Scraper]
    end

    Client -->|HTTPS: 443 / 80| Caddy
    Caddy -->|HTTP: 127.0.0.1:3131| Bot
    Bot --> DB
    Scheduler --> DB
```

---

## 🔒 Built-in Automatic HTTPS (Integrated Caddy)

HELIX RSS includes a built-in, native **Caddy Reverse Proxy Supervisor** (`src/proxy/caddy.ts`). It automatically handles SSL certificates across all operating systems without requiring third-party npm dependencies or complex certificate managers.

### How It Works:
1. **Zero-Config Installation**: On first launch, HELIX RSS verifies if Caddy is present on your system. If not found, it downloads the official static Caddy binary into `./data/bin/` for your OS (Windows, Linux, or macOS) and architecture (`x64`, `arm64`).
2. **Local Testing (`localhost`)**:
   - When `PUBLIC_URL` is omitted or set to `localhost`, Caddy automatically creates an internal Certificate Authority (CA) and serves trusted HTTPS.
   - Run `caddy trust` (or accept the local CA) to trust the local certificate across browsers.
3. **VPS with a Custom Domain**:
   - Set `PUBLIC_URL=https://rss.yourdomain.com` in `.env`.
   - Ensure DNS points your domain to your VPS IP and ports `80` and `443` are open.
   - Caddy automatically provisions and continuously renews production SSL certificates from **Let's Encrypt** or **ZeroSSL**.
4. **Lifecycle Management**: Caddy starts automatically alongside the bot and stops cleanly whenever the bot process shuts down.
5. **Opting Out**: Set `CADDY_ENABLED=false` in `.env` if you prefer to provide your own external reverse proxy (Cloudflare, Nginx, Traefik) or native SSL certificates via `SITE_SSL_KEY` and `SITE_SSL_CERT`.

---

## 🖥️ VPS & Bare-Metal Hosting

### 1. Linux VPS (Ubuntu / Debian / Raspberry Pi OS)

#### Step 1: Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git tar
```

#### Step 2: Clone & Configure
```bash
git clone https://github.com/HELIX-Origin/HELIX-RSS.git /opt/helix-rss
cd /opt/helix-rss
cp .env.example .env

# Edit .env and enter your credentials and domain
# e.g. PUBLIC_URL=https://rss.yourdomain.com
nano .env

npm ci
npm run build
```

#### Step 3: Run as a 24/7 systemd Service
Create the service unit file:
```bash
sudo tee /etc/systemd/system/helix-rss.service << 'EOF'
[Unit]
Description=HELIX RSS Daemon
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/helix-rss
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
EnvironmentFile=/opt/helix-rss/.env
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now helix-rss

# Check service status and logs
sudo systemctl status helix-rss
sudo journalctl -u helix-rss -f
```

---

### 2. Arch Linux & Fedora / RHEL

#### Arch Linux
```bash
sudo pacman -S nodejs npm git tar
git clone https://github.com/HELIX-Origin/HELIX-RSS.git
cd HELIX-RSS
cp .env.example .env
npm ci && npm run build
npm start
```

#### Fedora / RHEL
```bash
sudo dnf install -y nodejs git tar
git clone https://github.com/HELIX-Origin/HELIX-RSS.git
cd HELIX-RSS
cp .env.example .env
npm ci && npm run build
npm start
```

---

### 3. macOS (Local & Mini Servers)

#### Native Execution via Homebrew
1. Install prerequisites:
   ```bash
   brew install node@22 git
   ```
2. Clone, build, and launch:
   ```bash
   git clone https://github.com/HELIX-Origin/HELIX-RSS.git
   cd HELIX-RSS
   cp .env.example .env
   npm ci
   npm run build
   npm start
   ```

---

### 4. Windows (Local & Windows Server)

#### Native PowerShell Setup
1. Install Node.js 22 LTS from [nodejs.org](https://nodejs.org).
2. Open PowerShell:
   ```powershell
   git clone https://github.com/HELIX-Origin/HELIX-RSS.git
   cd HELIX-RSS
   Copy-Item .env.example .env
   # Edit .env with your credentials
   notepad .env
   npm ci
   npm run build
   npm start
   ```

---

## 🐳 Docker & Docker Compose

The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml`.

### Quick Start with Docker
```bash
# 1. Clone repository
git clone https://github.com/HELIX-Origin/HELIX-RSS.git
cd HELIX-RSS
cp .env.example .env

# 2. Edit .env with DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and PUBLIC_URL
nano .env

# 3. Launch container
docker compose up -d --build
```

- SQLite state and downloaded Caddy binaries persist in `./data` on the host machine.
- Container healthchecks monitor `http://127.0.0.1:3131/health` automatically.

---

## 🔧 Networking & Firewall Checklist

When deploying to a public VPS:
1. **Firewall / Security Groups**:
   - Allow inbound **Port 80** (HTTP - required for ACME Let's Encrypt challenges).
   - Allow inbound **Port 443** (HTTPS - public web traffic).
   - Keep internal port `3131` closed to the public internet (Caddy proxies to `127.0.0.1:3131` locally).
2. **DNS Configuration**:
   - Add an `A` record pointing `rss.yourdomain.com` to your VPS public IPv4 address.
   - (Optional) Add an `AAAA` record if using IPv6.
