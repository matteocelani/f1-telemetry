---
trigger: always_on
---

# COMMIT EXECUTION COMMAND

**Trigger:** When the user types `/commit`, `@commit`, or asks to "Make a commit" or "Push changes".

**Objective:** Act as an autonomous agent to validate code quality against project rules, stage changes, generate an accurate commit message, execute the commit, and push.

**EXECUTION STEPS:**

1. **Pre-flight Validation (CRITICAL):** Before staging anything, read and enforce the rules defined in:
   - `CLAUDE.md` — Primary source of truth for all coding and architecture rules.
   - `.agent/rules/global.md` — Frontend coding standards (TypeScript, styling, patterns).
   - `.agent/rules/project.md` — Architecture, folder structure, state management.
   Review ALL changed files (`git diff` + `git diff --staged`) against these rules. Check for:
   - `any` usage in TypeScript
   - Relative imports (must be `@/` absolute)
   - Inline CSS (`style={{}}`) where Tailwind should be used
   - Arbitrary Tailwind values (`w-[50px]`, `h-[20px]`)
   - `console.log` statements (only `warn`/`error`/`info` allowed)
   - Magic numbers in business logic
   - `export default` (only allowed in Next.js routing files)
   - Swallowed errors (`catch (e) { console.log(e) }`)
   - Raw `useQuery`/`useMutation` calls outside custom hooks
   - Wrong import order
   If violations are found: **fix them automatically**, then continue. If a fix is ambiguous, ask the user.
2. **Run TypeScript Check:** Execute `pnpm --filter frontend lint` (or equivalent). If errors exist, fix them before proceeding. Zero errors required.
3. **Stage All Changes:** Execute `git add .` to stage all modified, deleted, and new files.
4. **Analyze STAGED Changes (CRITICAL):** Execute `git diff --staged` to read the EXACT code differences. Base the commit message strictly on this output. Do NOT rely on chat history. Analyze EVERY file in the staged diff.
5. **Format Title:** Create a precise Conventional Commit title (max 72 characters) in English.
   - Prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`, `test:`, `ci:`, `perf:`
   - Use imperative mood (e.g., `feat: add driver comparison overlay`)
   - Scope is optional but recommended for monorepo clarity (e.g., `feat(frontend): add driver comparison overlay`, `fix(backend): handle SignalR reconnection timeout`, `chore(core): export weather payload types`)
6. **Format Body:** Create a concise body explaining what changed across ALL files.
   - Use a bulleted list.
   - Format: `- [File/Folder]: Brief explanation of the technical change.`
   - Keep it strictly factual. Do not explain _why_ unless it's a complex architectural decision.
7. **Execute Commit:** Run: `git commit -m "<TITLE>" -m "<BODY>"`
8. **Push Changes:** Run: `git push` (if the branch has no upstream, run `git push -u origin HEAD`).

**STRICT RULES:**

- **No Chatter:** Do not explain the diff to the user. Just execute the steps silently.
- **Output:** Once complete, output ONLY: `✅ Committed and pushed (hash: a1b2c3d)`
- **Empty Diff:** If `git diff --staged` returns nothing, do NOT create an empty commit. Inform the user there are no changes to commit.
- **Validation First:** NEVER commit code that violates the rules in `global.md` or `project.md`. Fix first, commit after.
