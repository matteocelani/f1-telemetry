FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy lockfile and package manifests for layer caching
COPY pnpm-lock.yaml package.json ./
COPY core/package.json core/
COPY apps/backend/package.json apps/backend/

# Override workspace config to only include packages needed for the backend
RUN printf 'packages:\n  - "core"\n  - "apps/backend"\n' > pnpm-workspace.yaml

# Install all dependencies (dev included for build)
RUN pnpm install --no-frozen-lockfile --prod=false

# Copy source code
COPY core/ core/
COPY apps/backend/ apps/backend/

# Build shared types then backend (tsc-alias rewrites path aliases)
RUN pnpm --filter @f1-telemetry/core build && pnpm --filter backend build

# --- Production stage ---
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml package.json ./
COPY core/package.json core/
COPY apps/backend/package.json apps/backend/

RUN printf 'packages:\n  - "core"\n  - "apps/backend"\n' > pnpm-workspace.yaml

RUN pnpm install --no-frozen-lockfile --prod

# Copy built output
COPY --from=base /app/core/dist core/dist
COPY --from=base /app/core/package.json core/
COPY --from=base /app/apps/backend/dist apps/backend/dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/backend/dist/src/index.js"]
