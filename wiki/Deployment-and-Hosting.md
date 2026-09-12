# 🚀 Deployment & Hosting Guide

HELIX RSS is optimized for self-hosted deployments on **Docker**, **Linux VPS**, and bare metal with native SSL. Cloud PaaS platforms are intentionally not supported.

---

## 🐳 Option 1: Docker & Docker Compose (Recommended)

The repository ships with a production `Dockerfile` and `docker-compose.yml` (multi-stage Node 22 Alpine build, non-root user, `/health` probe, persistent SQLite volume).

### 1. Project Files Setup
```yaml
services:
  helix-rss:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: helix-rss
    restart: unless-stopped
    ports:
      - "3131:3131"
    volumes:
      - ./data:/app/data
    env_file:
      - path: .env
        required: false
    environment:
      - NODE_ENV=production
      - INTERNAL_URL=0.0.0.0
      - DISCORD_PORT=3131
      - SQLITE_DATA=/app/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3131/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### 2. Launch Container
```bash
# Build and start in background
docker compose up -d --build

# View real-time container logs
docker compose logs -f
```

---

## 🖥️ Option 2: Linux VPS with PM2 & Systemd

For hosting directly on an Ubuntu/Debian/Rocky Linux server:

### 1. Install Node.js & Global Process Manager
```bash
# Install Node.js 22.x LTS (required: >= 22.9.0 for native node:sqlite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Clone and Build Project
```bash
git clone https://github.com/HELIX-Origin/HELIX-RSS.git /opt/helix-rss
cd /opt/helix-rss

npm install
npm run build
cp .env.example .env
nano .env  # Configure credentials
```

### 3. Start with PM2
```bash
# Start the compiled server
pm2 start dist/index.js --name "helix-rss"

# Save PM2 process list and configure auto-restart on system reboot
pm2 save
pm2 startup
```

---

## 🌐 Reverse Proxy Configuration

When hosting the dashboard publicly on the web, place it behind a reverse proxy with SSL termination.

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name rss.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rss.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/rss.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rss.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3131;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*Make sure `PUBLIC_URL=https://rss.yourdomain.com` is configured in `.env` so OAuth callbacks are generated against the public hostname.*

### Caddy Configuration
```caddy
rss.yourdomain.com {
    reverse_proxy localhost:3131
}
```

---

## 🚫 Cloud PaaS Platforms (Retired)

Heroku, Render, Fly.io, and Railway deployment support has been **retired**. HELIX RSS is self-hosted exclusively on Local, VPS, and Docker. This removes platform-lock-in, payment barriers, and out-of-sync credential state.
