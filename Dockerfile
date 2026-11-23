# Slim Multi-Stage Production Dockerfile for Standalone Fahi-Videos 2.5V
# Uses Next.js output: "standalone" to avoid copying devDependencies & .next/cache into runtime image.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
ARG FAHI_EMBEDDED=0
ARG NEXT_PUBLIC_FAHI_EMBEDDED=0
ARG NEXT_PUBLIC_FAHI_BASE_PATH=""
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV FAHI_EMBEDDED=$FAHI_EMBEDDED \
    NEXT_PUBLIC_FAHI_EMBEDDED=$NEXT_PUBLIC_FAHI_EMBEDDED \
    NEXT_PUBLIC_FAHI_BASE_PATH=$NEXT_PUBLIC_FAHI_BASE_PATH \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python-is-python3 ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME="0.0.0.0" \
    PORT=3000 \
    FAHI_EMBEDDED=0 \
    NEXT_PUBLIC_FAHI_EMBEDDED=0 \
    NEXT_PUBLIC_FAHI_BASE_PATH="" \
    NEXT_TELEMETRY_DISABLED=1 \
    STUDIO_MEDIA_DIR=/media

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

RUN mkdir -p /media && chown node:node /media
USER node
EXPOSE 3000
CMD ["node", "server.js"]
