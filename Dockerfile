# ─── Stage 1: Build the React client ────────────────────────────────────────
FROM node:24-alpine3.23 AS client-builder

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─── Stage 2: Install server production dependencies ─────────────────────────
FROM node:24-alpine3.23 AS server-deps

# Build tools required for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 3: Production image ───────────────────────────────────────────────
FROM node:24-alpine3.23 AS production

# Non-root user (uid 1001 matches the node user in alpine images)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app/server

# Copy compiled node_modules from deps stage
COPY --from=server-deps --chown=nodejs:nodejs /app/server/node_modules ./node_modules

# Copy server source and package.json (needed for #imports map)
COPY --chown=nodejs:nodejs server/package.json ./
COPY --chown=nodejs:nodejs server/src/ ./src/

# Copy built client dist so the API can serve it as static files
COPY --from=client-builder --chown=nodejs:nodejs /app/client/dist /app/client/dist

# Pre-create volume mount points with correct ownership so Docker volumes
# inherit the right permissions on first mount
RUN mkdir -p /app/server/baileys_session /app/server/data && \
    chown -R nodejs:nodejs /app/server/baileys_session /app/server/data

USER nodejs

# No CMD here — each service defines its own command in compose.yaml
