---
trigger: always_on
---

# WORKSPACE RULES: PROJECT ARCHITECTURE

Apply these project-specific rules STRICTLY. Failure to follow these architectural guidelines will break the CI/CD pipeline.

## 1. MONOREPO STRUCTURE

This is an **open-source monorepo** managed with `pnpm workspaces`:

- **`core/`** — Shared TypeScript types and constants (`@f1-telemetry/core`). No runtime dependencies.
- **`apps/frontend/`** — Next.js (App Router) dashboard for real-time F1 telemetry visualization.
- **`apps/backend/`** — Node.js WebSocket relay server bridging F1's official SignalR live-timing to frontend clients.

Changes to `core/` affect both apps. Ensure backwards compatibility.

## 2. TECH STACK & LIBRARIES

- **Framework:** Next.js (App Router) with React.
- **Styling:** Tailwind CSS 4.
- **UI Components:** `shadcn/ui`, Radix UI primitives, and Framer Motion for animations.
- **Data Fetching:** `@tanstack/react-query` for REST API state. Native WebSocket for real-time telemetry.
- **Forms & Validation:** `react-hook-form` + `zod` schema. Always use `shadcn/ui` Form wrappers. NEVER build forms manually with raw `useState`.
- **Charts:** `recharts` and `uplot` for telemetry visualization.
- **Icons:** EXCLUSIVELY use `lucide-react`. No inline raw `<svg>` code.
- **Custom SVGs:** Use `@svgr/webpack`. Place `.svg` in `src/assets/icons` and import as React component.

## 3. DATA FLOW & FETCHING

- **Real-time telemetry:** F1 SignalR → Backend WebSocket relay → Frontend WebSocket client (`src/ws/`) → Zustand stores (`src/store/`) → React components.
- **REST data:** F1 API endpoints → TanStack Query hooks (`src/api/hooks/`) → React components.
- **No database.** All data comes from official Formula 1 live endpoints.
- **Data Fetching:** TanStack Query calls must be isolated in custom hooks within `src/api/hooks/` (shared) or `src/modules/[name]/hooks/` (feature-specific).

## 4. ARCHITECTURE & FOLDER STRUCTURE (MODULAR CONTEXT-FIRST)

We follow a strict "Modular Context-Based" architecture to prevent Prop Drilling and maintain clean separation of concerns.

- **`src/app/` (Routing):** Contains ONLY routing logic, page definitions, and page-specific components. Do NOT put heavy business logic here.
- **`src/providers/`:** Global state providers (QueryClient, Theme, etc.).
- **`src/modules/` (The Brain):** Complex features must live here. Each module should have its own Context to manage Business Logic (API calls, React Query) and Global UI State. Module folders MUST be lowercase.
- **`src/components/ui/` (Shadcn):** Contains ONLY unmodified `shadcn/ui` components. DO NOT alter these files.
- **`src/components/global/`:** Custom, highly reusable global components.
- **`src/api/`:**
  - `hooks/`: TanStack Query hooks organized by feature.
  - `utils/`: API client utilities (Axios fetcher, etc.).
- **`src/store/`:** Zustand stores for WebSocket-driven real-time state (telemetry, timing, connection, etc.).
- **`src/ws/`:** WebSocket client singleton with reconnection logic and stream buffering.
- **`src/lib/`:** Shared utilities (`cn()`, delta merge helpers, etc.).

- **Internal Module Structure:** Prioritize separation of concerns.
  - `src/modules/[name]/types.ts`: Contains all Interfaces and Types.
  - `src/modules/[name]/constants.ts`: Contains default values and configuration.
  - `src/modules/[name]/hooks/`: Specialized hooks.
  - `src/modules/[name]/Context.tsx`: The Provider component.

## 5. SHARED CORE PACKAGE (`@f1-telemetry/core`)

- Contains all F1 live-timing type definitions and channel constants.
- Imported in both frontend and backend as `@f1-telemetry/core`.
- Transpiled by Next.js via `transpilePackages`.
- Changes to core types must be backwards-compatible across both apps.

## 6. STATE MANAGEMENT DECISION MATRIX

- **Real-time WebSocket State:** Zustand stores in `src/store/` for high-frequency telemetry updates.
- **Business Logic & Shared Feature State:** React Context in `src/modules/` for complex features.
- **REST API State:** TanStack Query hooks in `src/api/hooks/`.
- **Local UI State:** `useState` for ephemeral UI states.
- **Prop Drilling:** Max 2 levels. Deeper = consume Context or Zustand store directly.

## 7. BACKEND ARCHITECTURE

- **WebSocket relay server** using the `ws` library on Node.js (not Express/Fastify).
- Connects to Formula 1's official SignalR live-timing endpoint.
- Relays decompressed telemetry updates to connected frontend clients.
- Separate HTTP health check endpoint for monitoring.
- Path aliases: `@services/*` and `@utils/*`.

## 8. ENVIRONMENT VARIABLES

- NEVER hallucinate, guess, or invent environment variable names.
- Always check `.env.example` files before implementing logic that requires them.
- Backend: `PORT` (WS server), `HEALTH_PORT` (HTTP health check).
- Frontend: `NEXT_PUBLIC_API_URL` (backend health), `NEXT_PUBLIC_WS_URL` (WebSocket relay).

## 9. FILE NAMING

- **Avoid `index.tsx`:** Name files explicitly.
- **Barrel Files:** Use `index.ts` ONLY for clean re-exports.

## 10. LINTING & IMPORTS

- **Absolute Paths Only:** Always use `@/` path alias in frontend. Relative paths STRICTLY PROHIBITED.
- **Import Order:** `react` → `next/*` → external packages → `@f1-telemetry/core` → `@/hooks` → `@/components` → `@/lib`. No blank lines between imports.
- **No Console Logs:** Only `console.warn`, `console.error`, or `console.info` are permitted.
- **Tailwind:** Use `cn()` from `@/lib/utils` to merge classes.
