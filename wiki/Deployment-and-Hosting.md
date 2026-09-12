# 🚀 Deployment & Hosting Guide

Discord-RSS is optimized for containerized deployments, self-hosted Linux VPS setups, and cloud container platforms.

---

## 🐳 Option 1: Docker & Docker Compose (Recommended)

Docker provides an isolated, production-ready environment with persistent data volumes.

### 1. Project Files Setup
Ensure your project contains the provided `docker-compose.yml`:

```yaml
version: '3.8'

services:
  discord-rss:
    build: .
    container_name: discord-rss
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=/app/data/discord-rss.sqlite
    env_file:
      - .env
    volumes:
      - ./data:/app/data
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
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Clone and Build Project
```bash
git clone https://github.com/your-username/Discord-RSS.git /opt/discord-rss
cd /opt/discord-rss

npm install
npm run build
cp .env.example .env
nano .env  # Configure credentials
```

### 3. Start with PM2
```bash
# Start production cluster process
pm2 start dist/dashboard/server.js --name "discord-rss"

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
        proxy_pass http://127.0.0.1:3000;
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
*Make sure `TRUST_PROXY=true` and `BASE_URL=https://rss.yourdomain.com` are configured in `.env`.*

### Caddy Configuration
```caddy
rss.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## ☁️ Cloud PaaS Deployments

### Railway / Render / Fly.io
1. Connect your GitHub repository.
2. Select **Docker** or **Node.js** build environment.
3. Configure your Environment Variables in the service settings.
4. Attach a persistent disk / volume mapped to `/app/data` to preserve your SQLite database across redeployments, or configure a managed PostgreSQL instance via `DATABASE_URL`.
