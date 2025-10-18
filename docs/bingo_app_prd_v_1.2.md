# 🎯 Bingo App — Product Requirements Document (v1.2)

> **This v1.2 revises v1.1 to incorporate clarified decisions on persistence, validation, accessibility, and theming behavior.**

---

## 1. Overview

The Bingo App is a **self-contained**, **offline-capable** HTML/JS/CSS application that presents a classical 5x5 bingo board. Users can mark/unmark cells, track Bingo states, and customize appearance and behavior via external configuration, word lists, and theme packs. The app runs entirely on the client, directly from a folder.

---

## 2. Goals

- Operate entirely client-side (no backend or server calls)
- Run directly from a folder — portable, offline, and self-contained
- Use **external JSON and text files** for configuration and content
- Support theming via external CSS and assets
- Provide a clean, intuitive UX for marking, clearing, regenerating boards
- Be easy to distribute (single folder or ZIP)
- **Persist the current game state across refreshes and browser restarts (v1.0).**

---

## 3. Core Functionality

### 3.1 Board Layout

- 5x5 standard bingo board
- Center square labeled **“Free”**
- Each board populated with **24 unique** words/phrases randomly selected from a user-provided word list file
- Layout and content regenerated randomly when the user clicks **“Regenerate Board”**
- Clicking a non-free cell toggles its marked/unmarked state
- **Free cell behavior:** Always **pre-marked**, **non-toggleable**, and always counts toward Bingo lines.

### 3.2 Marking and Clearing

- Clicking a non-free cell toggles between **marked** and **unmarked**
- **“Clear All”** resets all marks (except the Free cell, which remains marked), clears the Bingo indicator, and keeps the same layout and word list
- **“Regenerate Board”** re-randomizes the layout from the current word list and clears marks (Free remains marked)
- **“Load New List”** opens a file selector for a new text-based word list

### 3.3 Word List Rules & Validation

- External `.txt` file, **UTF‑8** encoding, one word or phrase per line
- Minimum **24 valid entries** required **after** trimming, blank-line removal, and de-duplication
- Disallow control characters and emoji/emoticon code points (text-only content)
- If validation fails (<24 valid entries, invalid encoding/content), show a **modal error** and **refuse to load**; the board remains in its **last valid state** (or an empty board with only Free marked if no prior state exists)
- Board regeneration always uses the **currently loaded, validated list**

---

## 4. Bingo Detection

- Automatically detects Bingo when 5-in-a-row is achieved (horizontal, vertical, or diagonal)
- **Evaluation timing:**
  - After every cell toggle
  - **On app load** (after restoring persisted state)
  - After theme switches (visual only; logic/state unaffected)
- On Bingo:
  - **Modal popup:** “Bingo Achieved!”  
    Options:
    - **New Board** — regenerates from current list
    - **Continue** — dismisses and allows continued play
  - Persistent **“BINGO”** indicator remains visible until **Clear All** or **New Board**
- Multiple simultaneous Bingos are supported; the indicator stays lit as long as one or more are active

**Algorithmic notes (to be mirrored in Tech Spec):**

- Represent marks as a 5×5 boolean matrix with the **Free** position always true
- Maintain precomputed line masks (12 total: 5 rows, 5 columns, 2 diagonals)
- On state change or load, compute `any(lineMask ⊆ marked)` to set the Bingo indicator

---

## 5. Persistence, File Handling & Resilience

### 5.1 State Persistence (v1.0, required)

- Persist **current board layout**, **marked cells**, **current theme**, and **active word list identity** (e.g., hash + filename, not the file contents) so that **refresh** and **browser restart** restore the game exactly as left
- Primary mechanism: **localStorage** (or IndexedDB)
- If user grants File System Access, optionally persist `bingo_settings.json` for cross-browser portability
- **On load:** restore state, re-run Bingo detection, re-apply theme, and render without losing marks
- **Corruption handling:** if persisted state fails validation, **reset to a known-good default** (empty board with Free marked), show a **modal** informing the user, and continue

### 5.2 Settings

- Stored in `./bingo_settings.json` **when available**; otherwise maintained in in-browser storage with an explicit **Export Settings** control
- JSON structure auto-created on first run
- Loaded on startup; updated when settings change
- If missing/corrupted, defaults are regenerated and the user is notified via modal
- The `markerColor` setting is a **global fallback**; themes may override via CSS. If no theme or theme-level marker style is applied, the fallback is used.

**Sample**

```json
{
  "version": "1.0.0",
  "theme": "office1",
  "lastWordListPath": "",
  "showTitle": true,
  "markerColor": "red",
  "fontSize": "normal",
  "bingoSound": true
}
```

### 5.3 File I/O

- Paths are **relative** to the HTML file (`./` prefix); no absolute or platform-dependent paths
- Only **local filesystem** access — no remote URLs or network requests
- Use **File System Access API** where supported
  - If unavailable or permission denied, provide explicit **Export/Import** UI that triggers a browser **Save As** dialog (download blob) and a standard **Open File** dialog for import

### 5.4 Word Lists

- Selected manually via file picker
- Must be valid `.txt` per validation rules
- Randomized unique entries populate board
- Reloaded or replaced only when user selects a new file

---

## 6. Themes

### 6.1 Theme Structure

```
./themes/<theme_name>/
    theme.json
    theme.css
    assets/
```

**theme.json Example**

```json
{
  "name": "Christmas",
  "description": "Festive red & green theme with holiday border",
  "css": "theme.css",
  "preview": "preview.jpg",
  "version": "1.0.0"
}
```

**theme.css Example**

```css
.board {
  background-color: #004400;
  color: #fff;
}
.button {
  background: #cc0000;
}
```

### 6.2 Theme Behavior

- Theme metadata loaded from `theme.json`; CSS dynamically applied
- Asset paths are relative within `./themes/...`; no remote URLs permitted
- **On theme switch, re-theme immediately** (hot reload) without reloading the app and **without altering state** (board layout, marks, Bingo indicator remain intact)
- If theme files are malformed/invalid: show **modal error** and **refuse to load**; revert to last valid theme

### 6.3 Default Themes

- new_years, happy_birthday, thanksgiving, christmas, office_1, office_2, office_3

---

## 7. Prompt & Workflow Packs

- Provide Markdown workflow documents to guide creation of new themes and word lists
- Bundled offline under `./designer/`; users open/read/copy prompts manually (no app integration)

Deliverables:

- `promptpack_theme_creation.md`
- `promptpack_wordlist_generation.md`

---

## 8. Deliverables

| File / Folder           | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `bingo_app.html`        | Main HTML app                                   |
| `./css/`                | Core styling                                    |
| `./js/`                 | App logic                                       |
| `./themes/`             | Default theme pack                              |
| `./designer/`           | Prompt/workflow packs                           |
| `./bingo_settings.json` | Auto-created config file (optional; exportable) |

All internal paths use `./` for relative access.

---

## 9. Accessibility (Baseline, v1.0)

- **Keyboard**: Tab/Shift+Tab for focus traversal; Arrow keys navigate grid; **Space/Enter toggles** cell mark; Esc closes modals
- **ARIA**: Use `role="grid"`/`gridcell` with `aria-selected` to reflect marked state; buttons have `aria-label`s; modals use `role="dialog"` with focus trap and `aria-modal="true"`
- **Focus**: Visible focus outlines on all interactive elements; focus returns to invoker after modal close
- **Contrast**: Ensure **WCAG 2.1 AA** color contrast for text and markers; include a **High Contrast** theme variant
- **Announcements**: Screen reader live region announces **“Bingo Achieved”** and error modal titles

---

## 10. Non-Functional Requirements

| Requirement           | Description                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Offline operation** | Runs fully offline; no network dependencies                                                             |
| **Portability**       | Folder can be zipped/moved without reconfiguration                                                      |
| **Compatibility**     | Supports Chromium (Chrome, Edge), Firefox, Safari                                                       |
| **Resilience**        | Auto-recovers if settings/state missing or corrupt (with user-facing modal)                             |
| **Versioning**        | Settings and theme packs include version fields                                                         |
| **Security**          | No remote file loading or execution of external code; sanitize JSON parsing; CSS only (no JS in themes) |
| **Performance**       | Initial load < 150ms on mid-tier hardware; interactions < 16ms/frame                                    |
| **Caching (SHOULD)**  | Consider a basic Service Worker to cache static assets for instant reloads                              |

---

## 11. Validation & Error UX

**Validation covers:**

- Word lists: UTF‑8, ≥24 valid lines after normalization, no emojis/control chars
- Themes: `theme.json` schema match, referenced files exist, CSS loads without syntax errors
- Settings/state: schema + bounds checks

**Error Modal pattern:**

- Title summarizing the problem (e.g., “Invalid Word List”)
- Body with actionable guidance
- Primary action (e.g., **Choose Another File**), secondary (**Reset State**), tertiary (**Learn More**) optional
- No reliance on console logs

---

## 12. Risks and Constraints

| Area            | Risk                                  | Mitigation                                                                  |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| File I/O        | Browser sandbox limits writes         | File System Access API where supported; otherwise Export/Import dialogs     |
| Path resolution | Manual theme installs may break paths | Validate on theme load; revert to default theme                             |
| Bingo logic     | Edge cases on restore                 | Re-evaluate all 12 lines on each state change and on load; Free always true |
| Theme loading   | CSS/JSON syntax errors                | Schema validation; modal error; fallback to last good theme                 |
| State integrity | Corrupted persisted data              | Validate; reset to known-good defaults with user notice                     |
| Content hygiene | Emoji/control chars in lists          | Validation + refusal to load                                                |

---

## 13. Out of Scope (v1.0)

- Multi-board / multiplayer / networking
- Theme JavaScript plugins (future exploration only)
- Remote content loading

---

## 14. Future Enhancements

- Animated or image-based markers
- Export current board as image/PDF
- Optional sound and animation themes
- **Extensibility hooks** for modular JS-based themes/plugins (to be defined later without complicating v1.0)

---

## 15. Versioning and Maintenance

- **PRD version:** 1.2
- **Settings file version:** Stored in JSON under `"version"`
- **Theme versioning:** `"version"` per theme; if incompatible, refuse to load with modal and revert to last-good theme
- Future updates must maintain backward compatibility or include migration logic.

---

## 16. Acceptance Criteria (Smoke Tests)

1. Refresh the page: board layout, marks, theme, and Bingo indicator restore exactly
2. Close and reopen the browser: same outcome as above
3. Switch theme: visuals change instantly; board state unchanged
4. Load invalid word list (<24 lines): modal error; board remains unchanged
5. Load malformed theme: modal error; revert to last-good theme
6. Toggle cells to create a Bingo: modal appears; indicator stays lit until cleared or new board
7. Corrupt local state (dev tool injection): app resets to default-with-free and shows a modal

---

## 17. Summary

This v1.2 PRD locks in **state persistence**, **robust validation + user-facing errors**, **immediate re-theming**, and **baseline accessibility** while maintaining the app’s offline, self-contained philosophy. The Technical Spec should now detail data schemas, storage keys, validation schemas, and event flow consistent with this document.
