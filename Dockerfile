# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# HELIX RSS - Production Dockerfile
# Multi-stage build with minimal attack surface and persistent SQLite volume.
# ------------------------------------------------------------------------------

# --- Stage 1: Build & Type Compilation ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig*.json ./
RUN npm ci

# Copy source and compile to dist/
COPY src/ ./src/
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    INTERNAL_URL=0.0.0.0 \
    DISCORD_PORT=3131 \
    SQLITE_DATA=/app/data

# Create application user and data directory
RUN addgroup -S helixgroup && adduser -S helixuser -G helixgroup && \
    mkdir -p /app/data && chown -R helixuser:helixgroup /app

# Copy production dependencies and compiled artifacts
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=helixuser:helixgroup /app/dist ./dist

# Persist data across container restarts
VOLUME ["/app/data"]

# Expose primary port
EXPOSE 3131

# Service healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3131/health || exit 1

# Run as non-root user
USER helixuser

ENTRYPOINT ["node", "dist/index.js"]
