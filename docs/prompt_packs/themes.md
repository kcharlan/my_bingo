# 🎨 Custom Theme Generation Guide for Bingo App (Standalone)

This document explains how to generate **drop-in compatible themes** for the Bingo App.  
Each theme produces **two files** — `theme.json` and `theme.css` — that the app loads dynamically.  
You don’t need to hand-edit paths or selectors if you use this correctly.

---

## ⚙️ How It Works

Each theme is generated using the **Strict Bingo Theme Generator Prompt** (below, fully inlined).  
This ensures:
- The JSON and CSS files match exactly in `theme-id`.
- The CSS includes proper `:root[data-theme="..."]` scoping for runtime theme swapping.
- Color contrast and structure meet accessibility (WCAG AA) requirements.
- Output is valid JSON and CSS, with no filenames or stray text.

Your result should always be **exactly two code blocks**:
1. JSON (the `/themes/<theme-id>/theme.json` content)
2. CSS (the `/themes/<theme-id>/theme.css` content)

Copy both into your app’s `/themes/<theme-id>/` folder and you’re done.

---

## 🧩 The Strict Bingo Theme Generator Prompt (Self-Contained)

Paste the entire block below into your model, then append three lines defining your theme’s name, id, and mood cue.

```text
STRICT BINGO THEME GENERATOR — CODEBLOCK-ONLY OUTPUT

You are generating a Bingo App theme named "<ThemeName>".

Goal:
Create a cohesive, accessible color theme and output exactly TWO code blocks in this exact order:
1) A `json` code block for /themes/<theme-id>/theme.json
2) A `css` code block for /themes/<theme-id>/theme.css

CRITICAL OUTPUT RULES (no exceptions):
- Output ONLY two fenced code blocks. No filenames, no headings, no commentary, no blank lines before/after. 
- Code fence languages MUST be `json` and `css` (in that order).
- Do NOT include paths or filenames inside the code blocks. Only the file contents.
- The theme id is case-sensitive and must match in JSON and in EVERY CSS selector scope: :root[data-theme="<theme-id>"].
- Include a root binding and ThemeName in the JSON. The app swaps themes dynamically using the data-theme selector.
- All colors are 6-digit HEX in JSON. In CSS, use HEX for solids and rgba() ONLY where explicitly specified below.
- Ensure WCAG AA contrast (≥ 4.5:1) between “background” and “text”.
- Compute PRIMARY_DARK as primary darkened ≈20% (sRGB).
- Compute OVERLAY_RGBA from the primary color with alpha 0.14: rgba(R,G,B,0.14).
- No extra fields, no CSS variables, no external URLs, no stray comments.

--------------------------------
FILE 1 CONTENT (json code block)
/* EXACT STRUCTURE — change only values */
{
  "name": "<ThemeName>",
  "version": "1.0.0",
  "css": "theme.css",
  "colors": {
    "background": "#RRGGBB",
    "text":       "#RRGGBB",
    "primary":    "#RRGGBB",
    "accent":     "#RRGGBB"
  },
  "font_family": "Georgia, Garamond, \"Times New Roman\", Times, serif",
  "notes": "<short aesthetic summary based on the Mood cue>"
}

Rules:
- All four color fields are required and valid 6-digit HEX.
- “text” vs “background” must pass WCAG AA.
- No extra keys.

--------------------------------
FILE 2 CONTENT (css code block)
/* EXACT SELECTOR SET & ORDER — change only VALUES; every selector must be prefixed with :root[data-theme="<theme-id>"] */

/* <ThemeName> — scoped and app-compatible */
:root[data-theme="<theme-id>"] {
  color-scheme: light; /* or dark if the palette is dark */
  background-color: #RRGGBB; /* bg */
}

:root[data-theme="<theme-id>"] body {
  background: #RRGGBB; /* bg */
  color: #RRGGBB;      /* text */
  font-family: Georgia, Garamond, "Times New Roman", Times, serif;
}

:root[data-theme="<theme-id>"] .app {
  background: #RRGGBB; /* paper */
  border: 2px solid #RRGGBB; /* border */
  box-shadow: 0 0 0 4px rgba(R,G,B,0.14); /* OVERLAY_RGBA from primary */
}

:root[data-theme="<theme-id>"] .app__instructions {
  color: #RRGGBB;
}

/* Bingo indicator */
:root[data-theme="<theme-id>"] .bingo-indicator {
  background: #RRGGBB; /* accent */
  color: #RRGGBB;
  border: 2px solid #RRGGBB;
}
:root[data-theme="<theme-id>"] .bingo-indicator[data-state="active"] {
  background: #RRGGBB; /* primary */
  color: #RRGGBB;
  box-shadow: 0 0 0 3px rgba(R,G,B,0.14); /* OVERLAY_RGBA from primary */
}

/* Toolbar */
:root[data-theme="<theme-id>"] .toolbar__theme-label {
  color: #RRGGBB;
}
:root[data-theme="<theme-id>"] .toolbar__button,
:root[data-theme="<theme-id>"] .toolbar__select {
  background: #RRGGBB; /* primary */
  border: 2px solid #RRGGBB; /* PRIMARY_DARK or border tone */
  color: #RRGGBB;
  box-shadow: none;
}
:root[data-theme="<theme-id>"] .toolbar__button:hover,
:root[data-theme="<theme-id>"] .toolbar__select:hover {
  background: #RRGGBB; /* PRIMARY_DARK (~20% darker than primary) */
  border-color: #RRGGBB;
  color: #RRGGBB;
}

/* Board */
:root[data-theme="<theme-id>"] .board-wrapper { background: transparent; }

:root[data-theme="<theme-id>"] .board {
  background: #RRGGBB;
  border: 2px solid #RRGGBB;
  box-shadow: 0 0 0 4px rgba(R,G,B,0.14); /* OVERLAY_RGBA from primary */
}

:root[data-theme="<theme-id>"] .board__cell {
  background: #RRGGBB;
  color: #RRGGBB;
  border: 2px solid #RRGGBB;
  box-shadow: none;
}
:root[data-theme="<theme-id>"] .board__cell:not([data-free="true"]):hover {
  transform: none;
  background: #RRGGBB;
}

/* Free and Marked states driven by your app’s data-* attributes */
:root[data-theme="<theme-id>"] .board__cell[data-free="true"] {
  background: #RRGGBB; /* accent */
  color: #RRGGBB;
  border-color: #RRGGBB;
}
:root[data-theme="<theme-id>"] .board__cell[data-state="marked"]::after {
  inset: 6px;
  background: rgba(R,G,B,0.14); /* OVERLAY_RGBA from primary */
  border: 2px solid #RRGGBB; /* primary */
}
:root[data-theme="<theme-id>"] .board__cell[data-state="marked"]::before {
  color: #RRGGBB; /* primary */
}

/* Focus ring on actual interactive elements */
:root[data-theme="<theme-id>"] .board__cell:focus-visible,
:root[data-theme="<theme-id>"] .toolbar__button:focus-visible,
:root[data-theme="<theme-id>"] .toolbar__select:focus-visible {
  outline: 3px solid #RRGGBB; /* PRIMARY_DARK */
  outline-offset: 4px;
  box-shadow: 0 0 0 4px rgba(R,G,B,0.14); /* OVERLAY_RGBA from primary */
}

/* Modals */
:root[data-theme="<theme-id>"] .modal-backdrop {
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}
:root[data-theme="<theme-id>"] .modal {
  background: #RRGGBB;
  color: #RRGGBB;
  border: 2px solid #RRGGBB;
}
:root[data-theme="<theme-id>"] .modal__body { color: #RRGGBB; }
:root[data-theme="<theme-id>"] .modal__button { border: 2px solid #RRGGBB; }
:root[data-theme="<theme-id>"] .modal__button--primary {
  background: #RRGGBB; /* primary */
  color: #RRGGBB; /* choose text color to pass contrast */
  box-shadow: none;
}
:root[data-theme="<theme-id>"] .modal__button--primary:hover { background: #RRGGBB; } /* PRIMARY_DARK */
:root[data-theme="<theme-id>"] .modal__button--secondary {
  background: #RRGGBB;
  color: #RRGGBB;
}
:root[data-theme="<theme-id>"] .modal__button--secondary:hover { background: #RRGGBB; }
:root[data-theme="<theme-id>"] .modal__button:focus-visible {
  outline: 3px solid #RRGGBB; /* PRIMARY_DARK */
  outline-offset: 2px;
  box-shadow: none;
}

--------------------------------
VALIDATE BEFORE FINISH:
- JSON parses; CSS parses; exactly two code blocks with languages `json` then `css`.
- “text” vs “background” ≥ 4.5:1 (WCAG AA).
- PRIMARY_DARK ≈ 20% darker than primary (sRGB).
- OVERLAY_RGBA uses primary’s RGB with alpha 0.14 everywhere specified.
- Palette matches Mood cue.
- The theme id is identical in JSON and all CSS selectors.

--------------------------------
APPLY THESE VALUES AT GENERATION TIME (append below when you run this):
ThemeName: "Your Theme Name"
theme-id: your_theme_id
Mood cue: "Describe the visual and emotional feel you want."
```

---

## 🍂 Example: Thanksgiving (Inline Use)

Copy the **Strict Bingo Theme Generator** prompt above, then append:

```
ThemeName: "Thanksgiving"
theme-id: thanksgiving
Mood cue: "Warm autumn palette with parchment backgrounds, soft brown borders, and orange-gold accents reminiscent of harvest and candlelight."
```

Run it; copy the two returned code blocks into `/themes/thanksgiving/`.

---

## 🎄 Example: Christmas (Inline Use)

For a cooler, bright winter style with red and green accents, use:

```
ThemeName: "Christmas"
theme-id: christmas
Mood cue: "Bright, snowy whites with holly red and evergreen contrast; light sparkle aesthetic with warm gold highlights."
```

Run it; copy the two returned code blocks into `/themes/christmas/`.

---

## 🏢 Office-Themed Starters

Use the same strict generator with these predefined directions:

### **Office Neutral**
```
ThemeName: "Office Neutral"
theme-id: office-neutral
Mood cue: "Professional grayscale with navy and steel blue highlights; minimalist and calm."
```

### **Office Dark**
```
ThemeName: "Office Dark"
theme-id: office-dark
Mood cue: "Muted charcoal with faint blue highlights; good for long sessions and low eye strain."
```

### **Office High Contrast**
```
ThemeName: "Office High Contrast"
theme-id: office-highcontrast
Mood cue: "Bright white background, crisp black text, and strong blue accents for maximum legibility."
```

---

## 🎨 Seasonal & Specialty Starters

Add more by copying the same generator structure and adjusting these sample lines:

### **Dark Harvest**
```
ThemeName: "Dark Harvest"
theme-id: darkharvest
Mood cue: "Deep soil tones with burnt orange and crimson; a gothic fall aesthetic with glowing ember undertones."
```

### **New Year**
```
ThemeName: "New Year"
theme-id: newyear
Mood cue: "Midnight blues, silver gradients, and champagne gold text highlights; festive but modern."
```

### **Spring Garden**
```
ThemeName: "Spring Garden"
theme-id: springgarden
Mood cue: "Soft greens and pastel pinks with white flower tones; airy and optimistic."
```

---

## 🧠 Tips for Consistent Results

- Always verify that both files parse cleanly (no missing braces or unmatched brackets).
- Check that your text color passes contrast checks against the background.
- If the theme looks washed out or fails accessibility, slightly darken your primary and accent tones.
- Keep the mood cue short and descriptive; the model’s palette logic depends on it.
- Store all theme folders under `/themes/<theme-id>/` — the app swaps dynamically by data-theme binding.

---

## ✅ Summary

This file is **self-contained**.  
Everything you need to create new themes for the Bingo App — generator, format, and ready-to-run example prompts — is right here.  
Just copy the Strict Generator block, append your three values, and drop the resulting JSON and CSS into the app.
