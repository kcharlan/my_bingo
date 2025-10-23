# CONTRIBUTING — Bingo App (CLI Workflow)

This repo uses **LLM CLIs** (e.g., Gemini CLI, Codex CLI) that can **edit files directly** and **run commands**.  
Do not return diffs; write files in place and run the commands listed in the Execution Plan.

---

## 1) Ground Rules

- **Local-only**: No network requests, no remote URLs/CDNs.
- **Small steps**: Keep each task ≤ ~300–600 LOC changed.
- **Determinism**: Use seedable RNG when implementing generation logic.
- **Accessibility**: Treat a11y failures as release blockers (keyboard, ARIA, focus, contrast).
- **Security**: Themes are CSS-only; refuse `http(s)` assets; sanitize JSON.

---

## 2) File Map

```
/docs/
  Bingo_App_PRD_v1.2.md
  Bingo_App_Tech_Spec_v1.0.md
  Bingo_App_Test_Plan_v1.2.md
  Execution_Plan_CLI_v1.1.md
  execution_status.json   # machine-readable progress tracker
```

Code lives under `/js`, `/css`, `/themes`, `/designer` per the Tech Spec.

---

## 3) Preflight (recommended)

Run these and **degrade gracefully** if some tools are missing:

```bash
node -v || echo "Node not found — proceed without npm scripts"
npm -v  || echo "npm not found — skip npm steps"

eslint -v || echo "ESLint not installed — lint steps will be skipped"
npx --version || echo "npx unavailable — skip npx-based tools"

uname -a
```

---

## 4) Execution Loop

1. Open `/docs/Execution_Plan_CLI_v1.1.md` and read the first **unchecked** task in Section 2.
2. Create/edit files as required and run the task’s **commands**.
3. Verify the **acceptance** checks (mapped to Test Plan IDs).
4. If **all pass**:
   - Mark the checkbox in the Execution Plan (change `[ ]` → `[x]`).
   - Update `/docs/execution_status.json` with `"status": "done"`, add notes/artifacts if useful.
5. If **anything fails**:
   - Leave the checkbox **unchecked**.
   - Set `"status": "blocked"` (with a short reason) in `execution_status.json`.
   - Stop or request follow-up.

---

## 5) Status File Contract (`/docs/execution_status.json`)

```json
{
  "version": "1.0",
  "last_updated": "ISO-8601 timestamp",
  "tasks": [
    {
      "id": "T01",
      "status": "todo|doing|blocked|done",
      "notes": "optional context",
      "artifacts": ["paths"]
    }
  ]
}
```

- On each update, set `last_updated` to an ISO-8601 timestamp (UTC).
- This file is the **single source of truth** for automated resume.

---

## 6) Commands

Typical scripts (some steps may skip if tooling missing):

```bash
npm run lint
npm run test
# Playwright (optional):
npx playwright test --reporter=line
```

---

## 7) Style & Structure

- **JS modules** under `/js` (ESM).
- **CSS** in `/css`; no external fonts or CDN styles.
- **Themes** in `/themes/<name>/theme.json + theme.css` (relative assets only).
- **A11y**: `role="grid"`, `gridcell`, `aria-selected`, focus trap for dialogs, live region announcements.
- **Persistence**: restore on refresh/restart; reset on corruption with a user-facing modal.

---

## 8) Crash / Resume

If a run ends mid-task:

- Open `/docs/execution_status.json` to see the first `"status": "todo"` (or `"blocked"`) and resume from there.
- Inspect repo to reconcile partial changes before continuing.

---

## 9) PR & Review (human)

When handing off to a human reviewer:

- Ensure **Test Plan v1.2** acceptance items referenced by the task are green.
- Include a short summary in the PR of which tasks were completed and any `"blocked"` items.

---

Happy shipping!
