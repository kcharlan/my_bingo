# Changelog

## [1.0.0] - 2025-10-23

### Added

- Initial offline bingo application shell with 5×5 board, toolbar, indicator, modal root, and accessibility scaffolding.
- Persistent state store with validation, corruption recovery workflow, and localStorage fallback support.
- Board generation logic, bingo detection engine, and toolbar integrations for clear/regenerate/load list actions.
- Theme loader with local-only validation, high-contrast theme pack, and accessibility wiring (ARIA roles, focus, live announcements).
- Word list loader enforcing UTF-8, deduplication, emoji/control rejection, and detailed error modals.
- Security hardening for themes (no remote assets or JS), deterministic RNG via `BINGO_SEED`, and dev snapshot hook (`window.__bingo__`).

### Documentation

- Execution plan, PRD, tech spec, and test plan aligned for v1.0 delivery.
- Added release notes capturing acceptance results and distribution checklist.
