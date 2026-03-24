---
trigger: always_on
---

# COMMIT EXECUTION COMMAND

**Trigger:** When the user types `/commit`, `@commit`, or asks to "Make a commit" or "Push changes".

**Objective:** Act as an autonomous agent to stage ALL current changes, analyze EVERYTHING that has been staged, generate an accurate commit message following Conventional Commits, execute the commit, and push to the remote repository.

**EXECUTION STEPS:**

1. **Stage All Changes:** Execute `git add .` to stage all modified, deleted, and new files.
2. **Analyze STAGED Changes (CRITICAL):** Execute `git diff --staged` to read the EXACT code differences. Base the commit message strictly on this output. Do NOT rely on chat history. Analyze EVERY file in the staged diff.
3. **Format Title:** Create a precise Conventional Commit title (max 72 characters) in English.
   - Prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`, `test:`, `ci:`, `perf:`
   - Use imperative mood (e.g., `feat: add driver comparison overlay`)
   - Scope is optional but recommended for monorepo clarity (e.g., `feat(frontend): add driver comparison overlay`, `fix(backend): handle SignalR reconnection timeout`, `chore(core): export weather payload types`)
4. **Format Body:** Create a concise body explaining what changed across ALL files.
   - Use a bulleted list.
   - Format: `- [File/Folder]: Brief explanation of the technical change.`
   - Keep it strictly factual. Do not explain _why_ unless it's a complex architectural decision.
5. **Execute Commit:** Run: `git commit -m "<TITLE>" -m "<BODY>"`
6. **Push Changes:** Run: `git push` (if the branch has no upstream, run `git push -u origin HEAD`).

**STRICT RULES:**

- **No Chatter:** Do not explain the diff to the user. Just execute the steps silently.
- **Output:** Once complete, output ONLY: `✅ Committed and pushed (hash: a1b2c3d)`
- **Empty Diff:** If `git diff --staged` returns nothing, do NOT create an empty commit. Inform the user there are no changes to commit.
