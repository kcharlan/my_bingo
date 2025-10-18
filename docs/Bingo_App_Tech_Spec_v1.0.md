# 🧩 Bingo App — Technical Specification (v1.0)

> Scope: single-page, offline HTML/JS/CSS app; no network calls; strict local file handling; persistent game state with corruption recovery; hot re-theming; baseline a11y. This spec operationalizes PRD v1.2 requirements (persistence, validation, theming, a11y, error UX).

---

## 1) Architecture & Modules

**Runtime:** Single HTML entry (`bingo_app.html`) + JS modules under `./js/` + CSS under `./css/` + themes in `./themes/` + designer docs in `./designer/`.

**Modules (ES Modules):**

- `state/store.js`: persistent state, schema validation, load/save, corruption handling (reset + modal)
- `logic/board.js`: board generation from validated list, mark/unmark, free-cell invariants, 5×5 model
- `logic/bingo.js`: line masks (5 rows, 5 cols, 2 diags), recompute on every change and on load
- `io/wordlist.js`: file-open, normalization (trim, dedupe [case-insensitive]), UTF-8 verification, emoji/control-char rejection; error → modal; no change to board
- `theme/loader.js`: read `theme.json`, validate, inject CSS, hot swap, revert on failure; refuse remote URLs
- `ui/view.js`: render grid, toolbar, indicators, modals
- `ui/a11y.js`: roles, focus management, live region announcements
- `ui/modals.js`: standardized error/confirmation modal component (title, body, primary/secondary)
- `platform/fs.js`: File System Access API plumbing; fallback export/import (Save As)

---

## 2) Data Models & Storage

### 2.1 App State (persisted)

```json
{
  "schema": "bingo.state.v1",
  "board": {
    "size": 5,
    "cells": [ { "row":0,"col":0,"text":"...", "marked":false }, ... ],
    "free": { "row":2, "col":2 }
  },
  "bingo": { "hasBingo": false },
  "theme": { "id":"office_1", "version":"1.0.0" },
  "wordList": { "filename":"acme-words.txt", "hash":"sha256:..." },
  "meta": { "ts": 173... }
}
```

- Persist **board layout**, **marks**, **theme**, and **word list identity** (filename + hash).
- **On load:** restore, validate, recompute Bingo; if invalid → reset to default (empty + Free) and modal.
- Primary path: `localStorage`; optional `bingo_settings.json` for export/import.

**Storage keys**

- `bingo/state/v1`
- `bingo/settings/v1`

### 2.2 Settings File (`./bingo_settings.json`)

- Follows PRD sample structure.
- Cosmetic-only (fallbacks like `markerColor`), overridden by themes.

---

## 3) Validation Schemas

### 3.1 Word List Validation

- Source: `.txt`, UTF-8; normalize by trimming, removing blank lines, and de-duplicating (case-insensitive).
- Rules: ≥24 valid entries after normalization; reject emoji/emoticon code points and control chars.
- Failure UX: **Modal error**, refuse to load, board unchanged or default-with-Free.

### 3.2 Theme Validation

- `theme.json` requires `name`, `css`, `version`.
- Paths must be **relative**; remote URLs refused.
- CSS errors → **modal** + revert to last-good.
- Hot re-theme applies instantly, state preserved.

### 3.3 State Integrity

- Validate schema and bounds on load; failure → reset + modal.

---

## 4) Algorithms

### 4.1 Board Generation

- Shuffle validated list; select 24 unique words; Free fixed at (2,2).
- Free is **non-toggleable** and **always marked**.

### 4.2 Bingo Detection

- 12 precomputed line masks (rows, cols, diagonals).
- Evaluate on every toggle, on load, and after theme switch.

---

## 5) Event Flow

**Startup**

1. Load settings/state → validate.
2. Invalid → reset to default (Free marked), show modal.
3. Render board, theme, re-evaluate Bingo.

**User Actions**

- **Toggle cell** → update + recompute + persist.
- **Clear All** → unmark all but Free, clear indicator, persist.
- **Regenerate** → new layout from current list, Free marked.
- **Load List** → validate, on success regenerate; on failure modal.
- **Switch Theme** → validate + hot swap CSS; revert on failure.

**Bingo Event**

- Popup: “Bingo Achieved!” with **Continue** or **New Board**.

---

## 6) UI & Accessibility Implementation

- Grid: `role="grid"`, 25 `gridcell`s, `aria-selected` mirrors mark state.
- Keyboard: Arrows move focus, Space/Enter toggle, Tab traversal.
- Modals: `role="dialog"`, focus trapped, Esc closes, focus returns.
- Live region announces **Bingo Achieved** + error titles.
- Provide a **High Contrast** theme meeting WCAG 2.1 AA.

---

## 7) Error UX (Modal Contract)

- **Title:** Problem summary.
- **Body:** Cause + resolution.
- **Primary:** “Choose Another File” / “Revert Theme” / “Reset State”.
- **Secondary:** Cancel/Continue.
- **No console reliance.**

---

## 8) File I/O & Local Policy

- Local filesystem only, relative paths only.
- File System Access API when supported; otherwise Save-As Export/Import fallback.
- Refuse `http(s)` paths with modal error.

---

## 9) Security & Hygiene

- No JS execution in themes (CSS-only).
- Sanitize JSON with strict schemas.
- No external network requests.

---

## 10) Developer Hooks & Testing

- Flags: `BINGO_DEV_VALIDATE_STRICT`, `BINGO_DEV_FAKE_FS`.
- Deterministic RNG seedable via `BINGO_SEED`.
- Expose `window.__bingo__` (read-only snapshot for Playwright).

---

## 11) Acceptance Mapping (PRD §16)

| PRD Test                       | Spec Coverage                   |
| ------------------------------ | ------------------------------- |
| Refresh/restart persistence    | store.load()/validate/recompute |
| Theme switch, no state loss    | theme/loader hot-swap logic     |
| Invalid word list/theme modals | validation modules              |
| Bingo modal & indicator        | bingo.js logic + modal flow     |
| Corrupted state recovery       | store validator + reset modal   |

---

## 12) Critical Risks

- **Corruption loop**: reset must clear invalid keys before write.
- **Hot-swap timing**: ensure CSS fully loads before class flip.
- **Missing word list on restore**: modal prompts re-selection.
- **A11y regressions**: missing `aria-selected` or focus traps = blocker.

---

## 13) Deliverables

- `bingo_app.html`
- `/js/`, `/css/`, `/themes/`, `/designer/`
- Optional `bingo_settings.json` (export/import)

---

**Version:** 1.0  
**Aligned With:** _Bingo_App_PRD_v1.2_  
**Maintained By:** Kevin Harlan
