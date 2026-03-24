---
trigger: manual
---

# PULL REQUEST EXECUTION COMMAND

**Trigger:** When the user types `/pr`, `@pr`, or asks to "Open a PR".

**Objective:** Act as an autonomous agent to analyze ALL changes in the current branch, generate a professional PR title and body reflecting the ENTIRE scope of work, and create the Pull Request on GitHub.

**EXECUTION STEPS:**

1. **Analyze ALL Changes (CRITICAL):** Execute `git diff origin/main...HEAD` to read the FULL diff of the current branch against `main`. Do NOT rely only on the latest commit or chat context. Your analysis must encompass every file changed across the entire lifespan of this branch.
2. **Push Branch (if needed):** Ensure the current branch is pushed to the remote origin (`git push -u origin HEAD`).
3. **Format Title:** Create a short, professional PR title in English using imperative mood.
   - Examples: `Add real-time driver comparison overlay`, `Fix WebSocket reconnection on session change`, `Refactor timing store for delta updates`
   - Max 72 characters.
4. **Format Body:** Create the PR body strictly following this structure:

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
5. **Execute Command:** Use the GitHub CLI to create the PR.
   - **Default target:** `main` branch, unless the user explicitly asks for a different base.
   - Run: `gh pr create --base main --title "<TITLE>" --body "<BODY>"`

**STRICT RULES:**

- **No Chatter:** Do not explain to the user what you are doing. Just execute the steps silently.
- **Output:** Once executed, output ONLY the GitHub URL of the newly created Pull Request.
- **Branch Check:** If already on `main`, warn the user and do NOT create a PR from `main` to `main`.
