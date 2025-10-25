# 🎯 Bingo App Prompt Packs — Overview

These prompt packs let you (or a CLI model) generate **themes** and **word lists** for the Bingo App.

Each section in `themes.md` and `word_lists.md` is a complete, drop-in prompt:

1) Paste the **Manual Prompt** into any LLM (ChatGPT, Gemini, Claude, etc.).  
2) Immediately paste the **CLI Prompt** after it (unchanged).  
   The CLI prompt tells a coding-capable LLM to write files locally and validate them.

## Folder Structure

/docs/prompt_packs/
  _README.md
  themes.md
  word_lists.md

- `themes.md` → creates `/themes/<theme_name>/theme.json` and `/themes/<theme_name>/theme.css`
- `word_lists.md` → creates `/lists/<theme_name>.txt`

## Global Rules

- UTF-8 only. No emojis or images anywhere.
- Themes are **CSS-only** (no JS, no remote URLs).
- Colors in **HEX** only (e.g., `#112233`).
- **WCAG AA** contrast required between `background` and `text`.
- Word lists require **≥ 24** entries, one per line (≤ 25 chars).

## Theme JSON — Inline Schema (authoritative for prompts)

A valid `theme.json` **must** match this structure:

{
  "name": "<string, theme display name>",
  "version": "1.0.0",
  "css": "theme.css",                     // relative file name only
  "colors": {
    "background": "#RRGGBB",
    "text":       "#RRGGBB",
    "primary":    "#RRGGBB",
    "accent":     "#RRGGBB"
  },
  "font_family": "system-ui, Arial, sans-serif",
  "notes": "<optional short text>"
}

Rules:

- `css` must be a **relative** file name in the same folder (usually `theme.css`).
- All color fields are **required** and must be HEX like `#1A2B3C`.
- `font_family` must be web-safe (system-ui, Arial, Verdana, Georgia, etc.).
- No external/networked assets (no `http(s)`).
- File must be UTF-8.

## CSS Requirements (authoritative for prompts)

The generated `theme.css` should style at least these selectors (your app already expects equivalents):

- `body` (base font, background, text color)
- `.toolbar` (buttons, dropdowns)
- `.bingo-grid` and `.bingo-grid .cell`
- `.cell--free` (pre-marked center)
- `.cell--marked` (toggled cells)
- `.indicator` (Bingo state)
- `.modal` (basic modal look)
- Focus styles: `:focus-visible` with a clear outline (AA compliant).

## Customization

Templates are at the bottom of each file so you can create anything new quickly.
