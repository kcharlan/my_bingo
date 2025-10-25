# 📝 Word List Generation Prompts

Each section contains two parts:

1. **Manual Prompt** — Paste this directly into an LLM (ChatGPT, Gemini, Claude, etc.).
2. **CLI Prompt** — Paste this after the manual output so your CLI (Gemini CLI, Codex CLI, etc.) can write and validate the file automatically.

All prompts are **self-contained**.

---

## 🍂 Thanksgiving Word List

### Manual Prompt

Generate **40** Thanksgiving-related words and short phrases reflecting foods, gatherings, family, gratitude, and seasonal imagery.

Output rules:

- Plain text UTF-8 format.
- One entry per line (no numbering, commas, or quotes).
- No emojis, punctuation marks, or control characters.
- Each entry ≤ 25 characters.
- Include at least 24 unique valid entries (target 40).
- Avoid duplicates (case-insensitive check).

### CLI Prompt

Create `/lists/thanksgiving.txt` with the generated output.  
Validate that:

- The file is UTF-8 encoded.
- Each line has ≤ 25 visible characters.
- There are ≥ 24 unique entries.
- No emojis or control characters exist.

---

## 🎄 Christmas Word List

### Manual Prompt

Generate **40** Christmas and winter holiday-related words or short phrases. Include terms about decorations, family gatherings, music, traditions, gifts, and winter weather.

Output rules:

- Plain text UTF-8 format.
- One entry per line (no punctuation, numbering, or emojis).
- No control characters or duplicate entries (case-insensitive).
- Each entry ≤ 25 characters.
- Minimum 24 valid entries; target 40.
- Neutral phrasing (avoid religious exclusivity).

### CLI Prompt

Create `/lists/christmas.txt` from the generated output.  
Validate:

- UTF-8 encoding.
- ≥ 24 unique entries, no emojis.
- No lines exceed 25 characters.

---

## 🏢 Office 1 Word List

### Manual Prompt

Generate **40** office-related words and short phrases.  
Focus on work life, meetings, jargon, tools, documents, and coffee culture.  
Maintain a light, workplace-friendly tone.

Output rules:

- UTF-8 plain text.
- One entry per line.
- No emojis, control characters, or duplicates (case-insensitive).
- Each entry ≤ 25 characters.
- At least 24 valid entries (target 40).

### CLI Prompt

Create `/lists/office_1.txt`.  
Validate:

- UTF-8 encoding.
- ≥ 24 unique entries.
- No emojis or control characters.

---

## 🏢 Office 2 Word List (PM/Agile)

### Manual Prompt

Generate **40** project-management and productivity-related words or phrases.  
Include agile terminology, planning, delivery, retrospectives, and success metrics.

Output rules:

- UTF-8 plain text only.
- One entry per line.
- No emojis, punctuation, or duplicates (case-insensitive).
- Each entry ≤ 25 characters.
- Minimum 24 entries (target 40).

### CLI Prompt

Create `/lists/office_2.txt`.  
Validate:

- UTF-8 encoding.
- ≥ 24 unique entries.
- No emojis, control characters, or long lines (>25 chars).

---

## 🏢 Office 3 Word List (Remote / Team Culture)

### Manual Prompt

Generate **40** remote-work and collaboration-related words and short phrases.  
Focus on digital teamwork, tools, communication, humor, and shared experiences.  
Keep PG-rated and professional.

Output rules:

- UTF-8 plain text only.
- One entry per line.
- No emojis or control characters.
- Each entry ≤ 25 characters.
- Include at least 24 unique valid entries (target 40).
- Avoid personal names or sensitive data.

### CLI Prompt

Create `/lists/office_3.txt`.  
Validate:

- UTF-8 encoding.
- ≥ 24 unique entries.
- No emojis or control characters.

---

## 🧩 Custom Word List Template

### Manual Prompt

Generate **40** words or short phrases for the Bingo theme `<theme_name>`.

Rules:

- UTF-8 plain text only.
- One entry per line.
- No emojis, punctuation, or control characters.
- Each entry ≤ 25 characters.
- Minimum 24 unique valid entries (target 40).
- Ensure content fits the theme and is PG-rated.

### CLI Prompt

Create `/lists/<theme_name>.txt`.  
Validate:

- UTF-8 encoding.
- ≥ 24 unique entries.
- Each ≤ 25 characters.
- No emojis, control characters, or duplicates.
