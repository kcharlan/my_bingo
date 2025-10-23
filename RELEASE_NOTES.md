# Bingo App v1.0 — Release Notes

## Overview

The Bingo App v1.0 delivers an offline-capable single page experience for running customizable bingo games. It ships with full persistence, robust validation, accessibility features, and theming support backed by local assets only.

## Highlights

- 🎯 5×5 bingo grid with Free center, keyboard navigation, and live bingo indicator.
- 💾 Persistent state store with schema validation, corruption recovery flows, and word-list restoration prompts.
- 🎨 Theme system with high-contrast option, strict local-only enforcement, and instant re-theming.
- 📄 Word list ingestion with UTF-8 enforcement, deduplication, and actionable error modals.
- 🛡️ Security hardening that blocks remote/JS assets in themes and surfaces deterministic tooling hooks via `BINGO_SEED` and `window.__bingo__`.

## Assets

- Application entry point: `bingo_app.html`
- Core logic: `js/`
- Styling: `css/`
- Themes: `themes/`
- Fixtures: `fixtures/`
- Documentation: `docs/`

## Validation Summary

- Automated: `npm run lint`
- Manual checklist: Refer to `docs/Bingo_App_Test_Plan_v1.2.md` for the recommended acceptance script. (Manual UI verification not run within this CLI session.)

## Known Considerations

- No automated integration/E2E suite is included yet; deterministic hooks (`BINGO_SEED`, `window.__bingo__`) enable future Playwright coverage.
- Distribution packaging (zip/build pipeline) is not automated and should be produced manually as part of release operations.

## Next Steps

- Set up Playwright or equivalent E2E harness leveraging deterministic hooks.
- Add CI automation to run linting and future tests on commits.
