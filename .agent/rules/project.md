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
- **Forms & Validation (STRICT):** You MUST use `react-hook-form` validated with a `zod` schema for ANY form. Always use the `shadcn/ui` Form wrapper components (`Form`, `FormField`, `FormItem`, etc.). NEVER build forms manually using raw `useState`.
- **Charts:** `recharts` and `uplot` for telemetry data visualization.
- **Icons:** EXCLUSIVELY use `lucide-react`. Do not write inline raw `<svg>` code.
- **Custom SVGs:** If a custom SVG is needed, use `@svgr/webpack`. Place the `.svg` file in `src/assets/icons` and import it as a React component.

## 3. DATA FLOW & FETCHING

- **Real-time telemetry:** F1 SignalR → Backend WebSocket relay → Frontend WebSocket client (`src/ws/`) → Zustand stores (`src/store/`) → React components.
- **REST data:** F1 API endpoints → Axios fetcher → TanStack Query hooks (`src/api/hooks/`) → React components.
- **No database.** All data comes from official Formula 1 live endpoints.
- **Data Fetching:** TanStack Query calls must be isolated in custom hooks. Hooks should be organized within `src/api/hooks/` for shared data or within modules (`src/modules/[name]/hooks/`) for feature-specific logic.

## 4. ARCHITECTURE & FOLDER STRUCTURE (MODULAR CONTEXT-FIRST)

We follow a strict "Modular Context-Based" architecture to prevent Prop Drilling and maintain clean separation of concerns.

- **`src/app/` (Routing):** Contains ONLY routing logic, page definitions, and page-specific components. Do NOT put heavy business logic here.
- **`src/providers/`:** Global state providers (QueryClient, Theme, etc.).
- **`src/modules/` (The Brain):** Complex features must live here. Each module should have its own Context to manage Business Logic (API calls, React Query) and Global UI State.
- **`src/components/ui/` (Shadcn):** Contains ONLY unmodified `shadcn/ui` components. DO NOT alter these files.
- **`src/components/global/`:** Custom, highly reusable global components.
- **`src/api/` (Data Layer):**
  - `hooks/`: TanStack Query hooks organized by feature.
  - `utils/`: API client utilities (Axios fetcher, interceptors).
- **`src/store/`:** Zustand stores for high-frequency WebSocket-driven real-time state (telemetry, timing, connection, etc.).
- **`src/ws/`:** WebSocket client singleton with exponential backoff reconnection and stream buffering.
- **`src/lib/`:** Shared utilities (`cn()`, delta merge helpers, etc.).

- **Folder Casing:** Module folders in `src/modules/` MUST be lowercase (e.g., `src/modules/timing`, NOT `Timing`).
- **Internal Module Structure:** Prioritize separation of concerns.
  1. `src/modules/[name]/types.ts`: Contains all Interfaces and Types.
  2. `src/modules/[name]/constants.ts`: Contains default values and configuration.
  3. `src/modules/[name]/hooks/`: Specialized hooks.
  4. `src/modules/[name]/Context.tsx`: The Provider component.

## 5. STATE MANAGEMENT DECISION MATRIX

- **Real-time WebSocket State:** Zustand stores in `src/store/` for high-frequency telemetry updates that bypass React's rendering cycle.
- **Business Logic & Shared Feature State:** React Context inside `src/modules/` for complex features (API calls, computed data, UI state shared across distant components).
- **REST API State:** TanStack Query hooks in `src/api/hooks/`.
- **Local UI State:** Use `useState` directly inside the component for ephemeral UI states (e.g., dropdown open/closed, hover states). Do NOT pollute Context with local UI state.
- **Prop Drilling:** Max 2 levels deep. If data needs to go deeper, the child component MUST consume the Context or Zustand store directly.

## 6. BACKEND ARCHITECTURE

- **WebSocket relay server** using the `ws` library on Node.js (not Express/Fastify).
- Connects to Formula 1's official SignalR live-timing endpoint.
- Decompresses DEFLATE-encoded payloads and relays to frontend clients.
- Separate HTTP health check endpoint for monitoring.
- **Path aliases:** `@services/*` and `@utils/*` (not `@/`).
- Graceful shutdown handling for clean disconnection.

## 7. ENVIRONMENT VARIABLES

- NEVER hallucinate, guess, or invent environment variable names.
- Always check `.env.example` files to know the exact names of the variables required before implementing logic that requires them.
- **Backend:** `PORT` (WebSocket server), `HEALTH_PORT` (HTTP health check).
- **Frontend:** `NEXT_PUBLIC_API_URL` (backend health endpoint), `NEXT_PUBLIC_WS_URL` (WebSocket relay).

## 8. FILE NAMING & COMPONENT SIZING (NO INDEX HELL)

- **Avoid `index.tsx`:** Name files explicitly (e.g., `src/components/global/DriverBadge.tsx`).
- **Barrel Files:** Use `index.ts` ONLY for exporting parts of a complex component folder cleanly.

## 9. LINTING & IMPORTS (STRICT)

- **Absolute Paths Only:** Always use the `@/` path alias in frontend. Relative paths (`../` or `./`) are STRICTLY PROHIBITED.
- **Import Order:** Follow the exact project order: `react` first, `next/*` second, external packages third, `@f1-telemetry/core`, then `@/hooks`, `@/components`, and `@/lib` last. Do not use blank lines between imports.
- **No Console Logs:** Do not leave `console.log` in the code. Only `console.warn`, `console.error`, or `console.info` are permitted.
- **Tailwind:** Use `cn()` from `@/lib/utils` to merge Tailwind classes.
