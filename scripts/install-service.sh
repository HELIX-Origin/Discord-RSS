#!/usr/bin/env bash
# ==============================================================================
# HELIX RSS - systemd Service Installer & Setup Script
# ==============================================================================
set -euo pipefail

# Ensure script is run with root/sudo privileges
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "❌ This script must be run as root or with sudo:"
  echo "   sudo ./scripts/install-service.sh"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="helix-rss"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Detect real calling user when run with sudo
TARGET_USER="${SUDO_USER:-$(id -un)}"
TARGET_GROUP="$(id -gn "${TARGET_USER}" 2>/dev/null || echo "${TARGET_USER}")"
NODE_BIN="$(which node 2>/dev/null || echo "/usr/bin/node")"
NPM_BIN="$(which npm 2>/dev/null || echo "/usr/bin/npm")"

echo "=========================================================="
echo "🚀 Installing ${SERVICE_NAME} 24/7 systemd service..."
echo "📁 Working Directory: ${PROJECT_DIR}"
echo "👤 Service User:      ${TARGET_USER}:${TARGET_GROUP}"
echo "📦 npm Executable:    ${NPM_BIN}"
echo "=========================================================="

# Ensure project has build dist ready
if [ ! -d "${PROJECT_DIR}/dist" ]; then
  echo "🔨 Building project distribution..."
  if [ -n "${SUDO_USER:-}" ]; then
    sudo -u "${SUDO_USER}" bash -c "cd '${PROJECT_DIR}' && npm run build"
  else
    (cd "${PROJECT_DIR}" && npm run build)
  fi
fi

# Ensure data directory exists with proper permissions
mkdir -p "${PROJECT_DIR}/data"
chown -R "${TARGET_USER}:${TARGET_GROUP}" "${PROJECT_DIR}/data"

# Generate customized systemd service unit
cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=HELIX RSS - 24/7 Self-Hosted Discord RSS/Atom Bot & Dashboard
Documentation=https://github.com/HELIX-Origin/HELIX-RSS/wiki
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${TARGET_USER}
Group=${TARGET_GROUP}
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NPM_BIN} start
Restart=always
RestartSec=10
TimeoutStopSec=20

# Environment and capability bindings
Environment=NODE_ENV=production
EnvironmentFile=-${PROJECT_DIR}/.env
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Security & Sandboxing hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=${PROJECT_DIR}/data

# Logging configuration
StandardOutput=journal
StandardError=journal
SyslogIdentifier=helix-rss

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "${SERVICE_FILE}"

echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

echo "✅ Enabling and starting ${SERVICE_NAME} service..."
systemctl enable --now "${SERVICE_NAME}"

echo "=========================================================="
echo "🎉 ${SERVICE_NAME} service installed and running 24/7!"
echo ""
echo "Useful Management Commands:"
echo "  • Check status:  sudo systemctl status ${SERVICE_NAME}"
echo "  • View logs:     sudo journalctl -u ${SERVICE_NAME} -f"
echo "  • Restart:       sudo systemctl restart ${SERVICE_NAME}"
echo "  • Stop:          sudo systemctl stop ${SERVICE_NAME}"
echo "=========================================================="
