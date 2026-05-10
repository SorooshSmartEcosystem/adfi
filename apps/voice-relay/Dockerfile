# Voice relay — Twilio ConversationRelay <-> @orb/api / @orb/db.
# Deployed to Fly.io as a tiny always-on Node service. Each call
# opens one WebSocket; the relay dispatches per-turn LLM calls
# back to runSignal.

FROM node:20-alpine AS base

RUN corepack enable

WORKDIR /workspace

# Copy workspace manifests first for layered installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/voice-relay/package.json apps/voice-relay/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile --filter @orb/voice-relay...

# Copy the rest of the workspace files needed for the build.
COPY tsconfig.base.json* ./
COPY packages/config packages/config
COPY packages/db packages/db
COPY packages/api packages/api
COPY apps/voice-relay apps/voice-relay

# Generate Prisma client. We don't tsc-compile — tsx runs the
# TypeScript directly at startup, which avoids drift between the
# build module-resolution config and the rest of @orb/api (set up
# for Bundler resolution, not NodeNext).
RUN pnpm --filter @orb/db exec prisma generate

ENV NODE_ENV=production
EXPOSE 8787

CMD ["pnpm", "--filter", "@orb/voice-relay", "start"]
