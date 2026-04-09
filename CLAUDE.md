# CLAUDE CODE RULES

This file defines the strict quality and development standards for this codebase. All rules must be followed at all times.

---

## GLOBAL FRONTEND DEVELOPMENT RULES

### 1. TypeScript Strictness

- NEVER use `any`. This is a strict rule.
- Always type variables, function parameters, and return types correctly.
- Use precise Interfaces, Types, or Generics. If a type is truly unknown, use `unknown` and handle it properly.
- **Interfaces vs Types:** Use `interface` for core entities and object shapes. Use `type` ONLY for unions, intersections, and complex compositions.
- **Immutability:** Strictly use `as const` for fixed configuration objects and arrays to enforce literal typing.

### 2. Commenting Rules (Strict Format)

- **Language:** Write all comments exclusively in ENGLISH.
- **Length:** Comments must be extremely concise (1 or 2 lines maximum).
- **Content:** Only write technical comments that explain _why_ a complex logic is implemented, not _what_ the code does.
- **PROHIBITED FORMATS:**
  - NO numbered lists inside code comments.
  - NO bullet points or dashes.
  - NO decorative lines, ASCII art, or separators.
  - Write standard, inline sentences: `// Brief technical explanation here.`

### 3. Preserving Code, Diffing & Renaming

- **No Random Renaming:** NEVER arbitrarily change the names of existing functions, variables, or hooks. If a function is named `fetchData`, keep it `fetchData` unless explicitly asked to rename it.
- **Surgical Changes:** When modifying an existing file, alter ONLY the strictly necessary lines required to complete the task. Do not reformat, re-indent, or modify untouched surrounding code.
- **Preserve Comments:** DO NOT delete, alter, or format existing structural comments.
- Leave existing code structure completely untouched unless specifically instructed to refactor that exact block.

### 4. No Lazy Coding

- NEVER use placeholders like `// ... existing code ...` or `// implement logic here`.
- Always output the complete, functional code block required for the change, without truncating functions or objects.

### 5. Imports & Dependencies

- **Absolute Imports Only:** Use ABSOLUTE paths exclusively (e.g., `@/components/Button`). NEVER use relative paths like `../../utils` or `./components`.
- **No Hallucinations:** Use ONLY the libraries and dependencies already present in the codebase. Do not invent or import external packages unless explicitly requested.

### 6. React Architecture & Patterns

- Use Named Exports exclusively for components, functions, and hooks. Avoid `export default` (unless explicitly required by Next.js routing files like `page.tsx` or `layout.tsx`).
- DO NOT use `React.FC` or `React.FunctionComponent`. Type your component props directly (e.g., `function MyComponent({ prop }: MyProps)`).
- **Naming Convention:** Components MUST be `PascalCase`. Hooks and utility functions MUST be `camelCase`. Constants MUST be `UPPER_SNAKE_CASE`.
- **Context Safety:** Custom hooks consuming React Context MUST check if the context is `undefined` and throw a clear error if used outside their Provider.

### 7. Error Handling

- NEVER swallow errors silently.
- Using `try { ... } catch (e) { console.log(e) }` is strictly prohibited. You must handle errors properly, display them to the user if necessary, or `throw` them up the chain.
- **Error Chaining:** When catching and re-throwing errors, ALWAYS preserve the original trace using the `cause` property: `throw new Error('Action failed', { cause: error });`.

### 8. Naming Conventions & Magic Numbers

- **No Magic Values:** NEVER use hardcoded "magic numbers" or "magic strings" in business logic, computations, or conditions. Extract them into descriptive constants in `src/constants/` or the relevant module's `constants.ts` (e.g., `const MAX_RETRIES = 3;`, `const SECONDS_PER_HOUR = 3600;`).
- **What IS a magic number:** time durations, thresholds, API status codes, protocol values, format strings, locale identifiers, mathematical multipliers — any literal whose meaning is not immediately obvious from context.
- **What is NOT a magic number:** Tailwind CSS class values (`w-8`, `gap-2`, `grid-cols-4`), SVG attributes (`viewBox`, `cx`, `strokeWidth`, `d` paths), Framer Motion transition configs, `padStart(2, '0')`, and trivial `0`/`1` in boolean-like expressions. These are presentational values and stay inline.
- **Booleans:** Boolean variables must always start with a descriptive prefix like `is`, `has`, `should`, or `can` (e.g., `isValid`, `hasError`).

### 9. Styling (Strict Tailwind CSS)

- **Tailwind Only:** Exclusively use Tailwind CSS classes for styling. NEVER write inline CSS (`style={{...}}`).
- **No Arbitrary Values:** STRICT PROHIBITION on arbitrary dimension values (e.g., DO NOT use `w-[50px]`, `h-[20px]`, `gap-[15px]`). You MUST use standard Tailwind sizing/spacing classes (e.g., `w-12`, `h-5`, `gap-4`).
- **Merge Utilities:** Use a merge utility like `cn()` or `clsx` to concatenate dynamic or conditional classes cleanly.

### 10. General Best Practices

- **Early Returns:** Avoid deeply nested `if/else` pyramids. Use guard clauses to exit early.
- **Async/Await:** Use `async/await` exclusively. Do not use `.then().catch()` chains.
- **Immutability:** Never mutate states, objects, or arrays directly. Use spread operators, `map`, or `filter`.
- **Destructuring:** Always destructure props directly in the component parameters.
- **TanStack Query encapsulation:** ALWAYS encapsulate TanStack Query calls in custom hooks. Direct calls inside React components are strictly prohibited.

### 11. Code Quality and Optimization

- Write highly optimized, Senior-level code.
- Prevent unnecessary re-renders in React (use `useMemo`, `useCallback` appropriately).
- Keep the code ordered, clean, and modular.
- **Formatting:** NEVER write manual regex or logic for formatting numbers, dates, or currencies. You MUST use the native JavaScript `Intl` API.
- Do not output explanations or chatty text before or after the code block unless explicitly requested. Just output the clean code.

### 12. Build & Warnings (Zero Tolerance)

- **Failed Builds:** Code that breaks the build is unacceptable.
- **Zero Warnings:** The codebase must be 100% free of ESLint warnings and TypeScript errors.
- **Linting & Formatting:** You MUST adhere to the project's linting and formatting rules at all times.

---

## PROJECT ARCHITECTURE

### Overview

This is an **open-source monorepo** (`pnpm workspaces`) for real-time Formula 1 telemetry visualization. It consists of three packages:

- **`core`** — Shared TypeScript types and constants (F1 payload definitions, channel mappings).
- **`apps/backend`** — Node.js WebSocket relay server that connects to Formula 1's official SignalR live-timing endpoint and broadcasts data to frontend clients.
- **`apps/frontend`** — Next.js (App Router) dashboard that consumes live telemetry via WebSocket and REST data via F1 API endpoints.

### Tech Stack & Libraries

- **Framework:** Next.js (App Router) with React.
- **Styling:** Tailwind CSS 4.
- **UI Components:** `shadcn/ui`, Radix UI primitives, and Framer Motion for animations.
- **Data Fetching:** `@tanstack/react-query` for REST API state. Native WebSocket for real-time telemetry.
- **Forms & Validation:** `react-hook-form` + `zod` schema. Always use `shadcn/ui` Form wrappers. NEVER build forms manually with raw `useState`.
- **Charts:** `recharts` and `uplot` for telemetry visualization.
- **Icons:** EXCLUSIVELY use `lucide-react`. No inline raw `<svg>` code.
- **Custom SVGs:** Use `@svgr/webpack`. Place `.svg` in `src/assets/icons` and import as React component.

### Architecture & Folder Structure (Modular Context-First)

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

### Shared Core Package (`@f1-telemetry/core`)

- Contains all F1 live-timing type definitions and channel constants.
- Imported in both frontend and backend as `@f1-telemetry/core`.
- Transpiled by Next.js via `transpilePackages`.
- Changes to core types must be backwards-compatible across both apps.

### Backend Architecture

- **WebSocket relay server** (not Express/Fastify). Raw `ws` library on Node.js.
- Connects to Formula 1's official SignalR live-timing endpoint.
- Relays decompressed telemetry updates to connected frontend clients.
- Separate HTTP health check endpoint for monitoring.
- Path aliases: `@services/*` and `@utils/*`.

### Data Flow

- **Real-time data:** F1 SignalR → Backend WebSocket relay → Frontend WebSocket client → Zustand stores → React components.
- **REST data:** F1 API endpoints → TanStack Query hooks (in `src/api/hooks/`) → React components.
- **No database.** All data is fetched live from official Formula 1 endpoints.

### Environment Variables

- NEVER hallucinate, guess, or invent environment variable names.
- Always check `.env.example` files before implementing logic that requires them.
- Backend: `PORT` (WS server and health check endpoint).
- Frontend: `NEXT_PUBLIC_API_URL` (backend health), `NEXT_PUBLIC_WS_URL` (WebSocket relay).

### State Management

- **Real-time WebSocket State:** Zustand stores in `src/store/` for high-frequency telemetry updates.
- **Business Logic & Shared Feature State:** React Context in `src/modules/` for complex features.
- **REST API State:** TanStack Query hooks in `src/api/hooks/`.
- **Local UI State:** `useState` for ephemeral UI states.
- **Prop Drilling:** Max 2 levels. Deeper = consume Context or Zustand store directly.

### File Naming

- **Avoid `index.tsx`:** Name files explicitly.
- **Barrel Files:** Use `index.ts` ONLY for clean re-exports.

### Linting & Imports

- **Absolute Paths Only:** Always use `@/` path alias in frontend. Relative paths STRICTLY PROHIBITED.
- **Import Order:** `react` → `next/*` → external packages → `@f1-telemetry/core` → `@/hooks` → `@/components` → `@/lib`. No blank lines between imports.
- **No Console Logs:** Only `console.warn`, `console.error`, or `console.info` are permitted.
- **Tailwind:** Use `cn()` from `@/lib/utils` to merge classes.

---

## COMMIT RULES

When asked to commit (`/commit`):
1. Stage all changes with `git add .`
2. Analyze staged changes via `git diff --staged` (base message on this, NOT chat history)
3. Conventional Commit title (max 72 chars): `feat:`, `fix:`, `refactor:`, `chore:`, `style:`
4. Body as bulleted list: `- [File/Folder]: Brief explanation`
5. Execute `git commit -m "<TITLE>" -m "<BODY>"`
6. Push with `git push` (or `git push -u origin HEAD` if no upstream)
7. Output ONLY confirmation with commit hash

## PR RULES

When asked to open a PR (`/pr`):
1. Analyze FULL diff against base branch (`git diff origin/main...HEAD`)
2. Push branch if needed
3. Professional PR title in English
4. Body: follow the template in `.github/pull_request_template.md`
5. Execute `gh pr create --base main --title "<TITLE>" --body "<BODY>"`
6. Target `main` branch by default unless explicitly asked otherwise
7. Output ONLY the GitHub PR URL
