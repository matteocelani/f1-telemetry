---
trigger: manual
---

# PULL REQUEST EXECUTION COMMAND

**Trigger:** When the user types `/pr`, `@pr`, or asks to "Open a PR".

**Objective:** Act as an autonomous agent to validate code quality, analyze ALL changes in the current branch, generate a professional PR title and body, and create the Pull Request on GitHub.

**EXECUTION STEPS:**

1. **Pre-flight Validation (CRITICAL):** Before creating the PR, read and enforce the rules defined in:
   - `CLAUDE.md` — Primary source of truth for all coding and architecture rules.
   - `.agent/rules/global.md` — Frontend coding standards (TypeScript, styling, patterns).
   - `.agent/rules/project.md` — Architecture, folder structure, state management.
   Review ALL changed files (`git diff origin/main...HEAD`) against these rules. Check for:
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
   If violations are found: **fix them, commit the fix**, then continue. If a fix is ambiguous, ask the user.
2. **Run TypeScript Check:** Execute `pnpm --filter frontend lint` (or equivalent). If errors exist, fix and commit them before proceeding. Zero errors required.
3. **Analyze ALL Changes (CRITICAL):** Execute `git diff origin/main...HEAD` to read the FULL diff of the current branch against `main`. Do NOT rely only on the latest commit or chat context. Your analysis must encompass every file changed across the entire lifespan of this branch.
4. **Push Branch (if needed):** Ensure the current branch is pushed to the remote origin (`git push -u origin HEAD`).
5. **Format Title:** Create a short, professional PR title in English using imperative mood.
   - Examples: `Add real-time driver comparison overlay`, `Fix WebSocket reconnection on session change`, `Refactor timing store for delta updates`
   - Max 72 characters.
6. **Format Body:** Create the PR body strictly following this structure:

```
## Summary
<Max 250 characters. Straight to the point about the overall goal.>

## Changes
- [File/Component]: [Change description]
- [File/Component]: [Change description]

## Type
feat | fix | refactor | chore | style | docs | test | ci | perf
```

   - **Changes:** Bulleted list. Max 1 short sentence per point. Strictly factual (What and Where).
   - **Type:** Single label matching Conventional Commits prefix.
7. **Execute Command:** Use the GitHub CLI to create the PR.
   - **Default target:** `main` branch, unless the user explicitly asks for a different base.
   - Run: `gh pr create --base main --title "<TITLE>" --body "<BODY>"`

**STRICT RULES:**

- **No Chatter:** Do not explain to the user what you are doing. Just execute the steps silently.
- **Output:** Once executed, output ONLY the GitHub URL of the newly created Pull Request.
- **Branch Check:** If already on `main`, warn the user and do NOT create a PR from `main` to `main`.
- **Validation First:** NEVER open a PR with code that violates the rules in `global.md` or `project.md`. Fix first, PR after.
