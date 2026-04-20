# ── Stage 1: Build the Vite frontend ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Lean production runtime ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Set production env so server.ts serves from /dist
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.ts ./
COPY tsconfig.json ./

# Cloud Run provides PORT env var (defaults to 8080)
EXPOSE 8080

CMD ["node", "--import", "tsx/esm", "server.ts"]
