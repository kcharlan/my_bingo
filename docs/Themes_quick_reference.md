# Themes — Quick Reference

This app supports drop‑in CSS themes loaded from `./themes/` with no server restart.

## Folder layout

```
./themes/<theme_id>/
  theme.json   # required metadata
  theme.css    # required stylesheet referenced by theme.json
```

- `<theme_id>` must be letters, digits, `_`, or `-` (e.g., `thanksgiving`, `high_contrast`).
- Put only one theme per folder.

## theme.json (minimum)

```
{
  "name": "Thanksgiving",
  "version": "1.0.0",
  "css": "theme.css",
  "description": "Optional human‑readable description"
}
```

Rules:
- `css` must be a local relative path (no `http(s):`, `//`, absolute paths, or `..`).
- Metadata must be valid JSON; unknown fields are ignored.

## How discovery works

- On startup and every ~15s, the app scans `./themes/` and updates the Theme selector.
- If your static server exposes a directory listing at `/themes/`, the app parses it to find immediate child folders only.
- If no directory listing is available, add a `manifest.json` in `./themes/` using one of these formats:

Array of IDs
```
[
  "high_contrast",
  "thanksgiving"
]
```

Object wrapper
```
{
  "themes": ["high_contrast", "thanksgiving"]
}
```

The manifest is read on every refresh; changing it updates the list without restarting the server.

## Built‑in themes

- Default (Light)
- High Contrast (always available even if discovery is empty)

## Security & validation

- CSS is injected as a `<style>` tag; scripts are not executed.
- Remote URLs and absolute/parent paths are blocked.
- Invalid/missing files are skipped and the last good theme remains active.

## Troubleshooting

- Theme not showing:
  - Ensure the folder name matches ID rules and contains `theme.json` and `theme.css`.
  - Confirm your server lists `/themes/` or provide `./themes/manifest.json`.
  - Open DevTools console: warnings like `[theme/catalog] Skipping theme "…"` indicate what failed.
- Styles didn’t update: select the theme again. The loader fetches with `cache: "no-store"`.

## Tips

- Keep CSS small; avoid heavy assets.
- Prefer high contrast and accessible focus styles.
