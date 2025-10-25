# My Bingo

A simple, self-contained, offline classical (5x5) bingo application.

## Features

- **Offline:** No internet connection required or used.
- **Customizable:** Use your own word lists and themes.
  - Drop a theme folder into `./themes/` and it becomes selectable without restarting the server.
- **Persistent State:** Your game is saved locally, so you can pick up where you left off.
- **Keyboard Accessible:** Fully navigable using a keyboard.

## Getting Started

To get started, simply open the `bingo_app.html` file in your web browser.

UPDATE: Not true. Local files appears a cross site, and are blocked. You need to
run a web server.

Node (tested and worked):

```bash
npx http-server -c-1 .
```

Python (not tested):

```bash
python3 -m http.server 8080
```

Note: The app dynamically discovers themes from `./themes/`. Most static servers expose a simple directory listing at `/themes/`, which the app parses. If your server does not expose listings, add the optional manifest file described below.

## Usage

- Click on a square to mark it.
- Click "Clear All" to unmark all squares.
- Click "Regenerate Board" to create a new board with the current word list.
- Click "Load New List" to load a new word list from a `.txt` file.

### Themes

- Built‑in themes: `Default (Light)` and `High Contrast`.
- Dynamic theme discovery runs at startup and refreshes every 15 seconds (no server restart required). New themes appear in the Theme selector automatically.
- Theme ID rules (folder name under `./themes/`): letters, digits, `_`, `-` (e.g., `thanksgiving`, `high_contrast`).

Theme pack layout:

```
./themes/<theme_id>/
  theme.json   # required metadata
  theme.css    # required stylesheet (relative path referenced by theme.json)
```

`theme.json` schema (minimum):

```
{
  "name": "Thanksgiving",
  "version": "1.0.0",
  "css": "theme.css",
  "description": "Optional human‑readable description"
}
```

Security/validation:
- CSS and asset paths must be local and relative (no `http(s):`, `//`, absolute paths, or `..`).
- CSS is injected as a `<style>` element; no scripts are executed.
- Invalid packs are skipped and the last good theme remains active.

Optional `themes/manifest.json` (for servers without directory listings):

- If your server does not list directories at `/themes/`, create `./themes/manifest.json` so the app can enumerate available themes without parsing HTML.
- Two supported formats:

1) Array of IDs:
```
[
  "high_contrast",
  "thanksgiving"
]
```

2) Object wrapper with `themes`:
```
{
  "themes": ["high_contrast", "thanksgiving"]
}
```

Once present, the manifest is used for discovery and you can still add/remove theme folders; the list updates on the next refresh cycle.

For a focused, step‑by‑step guide, see `docs/Themes_quick_reference.md`.

## Contributing

Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for details.

## License

This project is licensed under the ISC License.
