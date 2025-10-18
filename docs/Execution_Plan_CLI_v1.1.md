# 🚀 Bingo App — Execution Plan (CLI‑Oriented) v1.1

> Purpose: A **machine-operable** plan for LLM CLIs (e.g., Gemini CLI, Codex CLI) that can directly edit files and run commands.  
> This replaces the diff-only workflow with **direct file writes** and **shell execution**. It also adds preflight checks and a machine-readable status file for robust resume.

---

## 0) Operator Protocol (for CLI models)

1. **Read**: Open this plan and `/docs` (PRD v1.2, Tech Spec v1.0, Test Plan v1.2).
2. **Preflight**: Run §3 preflight; if a tool is missing, **degrade gracefully** (skip or ask to install).
3. **Select step**: Find the first unchecked task in §2.
4. **Execute**: Create/edit files directly; run the listed commands.
5. **Verify**: Ensure acceptance checks/test IDs pass.
6. **Update status**:
   - Edit this document: mark the checkbox ✅ and set the YAML `status: done`.
   - Update `execution_status.json` (see §4) for machine-resume.
7. **Proceed**: Repeat from Step 3.

**Guardrails**

- **No network code** and no remote URLs; local-only assets.
- Keep each task ≤ ~300–600 LOC changed; split if larger.
- Do **not** add new dependencies unless the task explicitly allows it.
- If a command is unavailable, **skip with note** and continue where possible.

---

## 1) References

- **PRD:** `/docs/Bingo_App_PRD_v1.2.md`
- **Tech Spec:** `/docs/Bingo_App_Tech_Spec_v1.0.md`
- **Test Plan:** `/docs/Bingo_App_Test_Plan_v1.2.md`

---

## 2) Task List (CLI Edition)

> Each task includes: **Goal → Files to write/edit → Commands to run → Accepts (tests/criteria)**.  
> On completion: check the box **and** update `execution_status.json` per §4.

### [x] T01 — Repo scaffold & tooling

```yaml
id: T01
status: done
goal: Create repo skeleton (/js, /css, /themes, /designer, /docs) plus ESLint/Prettier and npm scripts.
files:
  - package.json
  - .eslintrc.json
  - .prettierrc
  - bingo_app.html
  - directories: /js, /css, /themes, /designer, /docs
commands:
  - npm install (optional; if npm unavailable, skip and mark note)
  - npm run lint (optional; may fail until files exist)
accepts:
  - repo builds with minimal shell (open bingo_app.html locally)
  - lint runs without fatal errors
```

### [x] T02 — UI shell + 5×5 grid markup

```yaml
id: T02
status: done
goal: Static 5×5 board with Free center; toolbar; indicator; modal root; live region.
files:
  - /css/app.css
  - /js/ui/view.js
  - update: bingo_app.html (include modules and containers)
commands: []
notes: Static shell rendered with placeholder data; ESLint unavailable during preflight.
artifacts:
  - Preflight: ESLint not installed; lint steps deferred.
accepts:
  - F1 initial render
  - A6 visible focus
  - A7 focus indicators present
```

### [x] T03 — State store (persist/validate/reset)

```yaml
id: T03
status: done
goal: state/store.js with load/save, schema validation, corruption reset modal hook.
files:
  - /js/state/store.js
  - /js/state/__tests__/store.test.js (optional if test runner available)
commands:
  - npm run test (optional)
notes: Implemented resilient state store with schema validation, localStorage fallback, and corruption placeholder modal hook via UI. Lint suite run post-change.
artifacts:
  - npm run lint
accepts:
  - F2 refresh persistence
  - F3 restart persistence
  - F4 corruption reset (modal)
  - FH7 fallback storage works
  - FH8 corrupted state → reset
  - E3 modal surfaced
```

### [ ] T04 — Board model & generation

```yaml
id: T04
status: todo
goal: logic/board.js for layout generation; Free invariants enforced.
files:
  - /js/logic/board.js
commands: []
accepts:
  - F6 toggle works (with stub)
  - F8 regenerate clears marks and keeps list
```

### [ ] T05 — Bingo detection engine

```yaml
id: T05
status: todo
goal: logic/bingo.js with 12 masks; evaluate on change and load.
files:
  - /js/logic/bingo.js
commands: []
accepts:
  - F13 line detection
  - F14 multiple Bingos
  - F15 unmark clears only when zero lines
  - F16 on-load re-check works
```

### [ ] T06 — Modal component & error UX

```yaml
id: T06
status: todo
goal: ui/modals.js with focus trap, Esc close, return focus; standard API.
files:
  - /js/ui/modals.js
commands: []
accepts:
  - A2 focus trap/esc/return
  - E1/E2/E3/E5 error modals
```

### [ ] T07 — Accessibility wiring

```yaml
id: T07
status: todo
goal: ui/a11y.js with roles, aria-selected sync, live region announcements.
files:
  - /js/ui/a11y.js
commands: []
accepts:
  - A1 keyboard nav across grid
  - A3 proper ARIA roles/states
  - A4 live announcements
```

### [ ] T08 — Theme loader (hot re-theme)

```yaml
id: T08
status: todo
goal: theme/loader.js reads theme.json; validate; inject CSS; revert on failure.
files:
  - /js/theme/loader.js
commands: []
accepts:
  - T1 loads theme
  - T2 hot re-theme without state loss
  - T3/T4 fallback on missing/invalid theme
  - T5 refuse remote URLs
```

### [ ] T09 — Word list loader & strict validation

```yaml
id: T09
status: todo
goal: io/wordlist.js with UTF‑8 check, trim, case-insensitive dedupe, emoji/control rejection.
files:
  - /js/io/wordlist.js
  - /fixtures/valid_30.txt
  - /fixtures/bad_23_after_trim.txt
  - /fixtures/emoji_in_lines.txt
commands: []
accepts:
  - F9 valid list loads & populates
  - F10 short list blocked (modal)
  - F11 duplicates deduped
  - F12 emoji/control rejected (modal)
  - E1 invalid encoding handled
  - S3 JSON/list sanitization applied
```

### [ ] T10 — Toolbar actions wiring

```yaml
id: T10
status: todo
goal: Hook Clear/Regenerate/Load List to store/board/bingo/wordlist.
files:
  - update: /js/ui/view.js
commands: []
accepts:
  - F7 clear works
  - F8 regenerate works
  - F9–F12 load/validate behavior correct
  - E5 reset flow correct
```

### [ ] T11 — Restore flow polish

```yaml
id: T11
status: todo
goal: Missing list modal; last-good theme fallback on failure.
files:
  - updates within store/theme loaders
commands: []
accepts:
  - F5 friendly missing-list modal
  - T3/T4 revert behavior
```

### [ ] T12 — High-contrast theme

```yaml
id: T12
status: todo
goal: WCAG AA high-contrast theme.
files:
  - /themes/high_contrast/theme.json
  - /themes/high_contrast/theme.css
commands: []
accepts:
  - A5 contrast thresholds met
  - T7 theme selectable
```

### [ ] T13 — Security & hygiene validation

```yaml
id: T13
status: todo
goal: Block http(s) and JS in themes; sanitize JSON.
files:
  - validators integrated in loaders
commands: []
accepts:
  - S1/S2/S3/S4 pass
```

### [ ] T14 — Determinism & dev hooks

```yaml
id: T14
status: todo
goal: Seedable RNG and window.__bingo__ snapshot for tests.
files:
  - config and test hook wiring
commands: []
accepts:
  - repeatable E2E with a fixed seed
```

### [ ] T15 — Final acceptance & regression pass

```yaml
id: T15
status: todo
goal: Run full Test Plan v1.2; fix issues; tag v1.0.
files:
  - /CHANGELOG.md
  - /RELEASE_NOTES.md
commands:
  - npm run test (if configured)
  - manual check of regression checklist
accepts:
  - All regression items ticked
```

---

## 3) Preflight (CLI may run and adapt)

```bash
# language runtime
node -v || echo "Node not found — proceed without npm scripts"
npm -v || echo "npm not found — skip npm steps"

# optional tools (safe to skip)
eslint -v || echo "ESLint not installed — lint steps will be skipped"
npx --version || echo "npx unavailable — skip npx-based tools"

# environment basics
uname -a
```

If any tool is missing, proceed with file creation and manual checks. Leave a note in the task YAML `artifacts:` field.

---

## 4) Machine-Readable Status (execution_status.json)

LLM CLIs must maintain `/docs/execution_status.json` with an array of task records:

```json
{
  "version": "1.0",
  "last_updated": "ISO-8601",
  "tasks": [
    { "id": "T01", "status": "done", "notes": "", "artifacts": [] },
    { "id": "T02", "status": "todo", "notes": "", "artifacts": [] }
  ]
}
```

- **status** ∈ { "todo", "doing", "blocked", "done" }
- This file is the **single source of truth** for machine resume.

---

## 5) Kickoff Prompt (for CLI models)

```
Open /docs and read: PRD v1.2, Tech Spec v1.0, Test Plan v1.2, and this Execution Plan (v1.1).
Run the Preflight (Section 3). Then select the first unchecked task in Section 2.
Create/edit files directly and run the listed commands. Verify acceptance criteria.
If successful, mark the checkbox in this doc and set the YAML to status: done.
Also update /docs/execution_status.json accordingly.
Proceed to the next task.
```

---

## 6) Notes

- Keep patches small and self-contained.
- Prefer idempotent steps (safe to re-run).
- If a task needs new dependencies, add a T0x subtask first (owner approval).
