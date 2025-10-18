# 🧪 Bingo App Test Plan (v1.2)

## 1. Overview

This plan validates the Bingo App implementation per _Bingo_App_PRD_v1.2_ — covering functionality, persistence, validation UX, theming, accessibility, and security/content hygiene. It mixes automated (Playwright/Jest/axe-core) and manual checks (visuals, permissions, screen readers). **Cross-browser & performance testing have been intentionally excluded per scope.**

---

## 2. Test Categories

1. **Functional Tests** — core game logic, board generation, marking, Bingo detection
2. **File Handling & Persistence Tests** — creation, updates, corruption handling, export/import
3. **Theme Tests** — validation, application, hot re-theming, fallbacks
4. **Accessibility & UX Tests** — keyboard, ARIA, focus management, contrast, responsiveness
5. **Error Handling & Validation UX** — modals, refusal to load, console independence
6. **Security & Content Hygiene** — local-only content, JSON sanitation, remote URL rejection
7. **Regression Checklist** — high-level release gate checks
8. **Tooling Notes** — automation and reporting setup
9. **Document Metadata** — versioning and alignment

---

## 3. Functional Tests

| ID  | Description                          | Expected Result                                                                           | Type   |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------- | ------ |
| F1  | Initial load with no prior state     | Board appears with Free (center) marked; default theme; Bingo indicator off               | Auto   |
| F2  | Refresh persistence                  | Refresh restores layout, marks, theme, and Bingo indicator                                | Auto   |
| F3  | Browser restart persistence          | Close and reopen browser restores full state                                              | Auto   |
| F4  | Corrupted state                      | Inject invalid storage JSON; app resets to default (empty + Free), **modal shown**        | Auto   |
| F5  | Missing word list file on restore    | Modal prompts user to re-select or choose a new list; board remains last valid or default | Manual |
| F6  | Mark/unmark cells                    | Clicking a non-Free cell toggles its visual and logical state                             | Auto   |
| F7  | Clear All                            | Clears all non-Free marks; Bingo indicator off; layout and list unchanged                 | Auto   |
| F8  | Regenerate board                     | New random layout from current validated list; clears marks; Free remains marked          | Auto   |
| F9  | Load new valid list                  | Board updates and randomizes using new list; marks cleared                                | Manual |
| F10 | Short list (<24 after normalization) | **Modal error**; refuse to load; board unchanged                                          | Auto   |
| F11 | Duplicate lines in list              | Deduplicated before population; 24 unique entries used                                    | Auto   |
| F12 | Text-only enforcement                | Any emoji/control chars cause **modal + refusal**                                         | Auto   |
| F13 | Bingo detection — line types         | Completing any row/column/diagonal triggers popup and lights indicator                    | Auto   |
| F14 | Multiple simultaneous Bingos         | Indicator remains lit as long as ≥1 line is complete                                      | Auto   |
| F15 | Unmark clears Bingo                  | Indicator turns off only when **no** lines remain complete                                | Auto   |
| F16 | On-load Bingo re-check               | If persisted board already has Bingo, indicator is lit on load                            | Auto   |

---

## 4. File Handling & Persistence Tests

| ID  | Description               | Expected Result                                                         | Type   |
| --- | ------------------------- | ----------------------------------------------------------------------- | ------ |
| FH1 | Settings creation         | `bingo_settings.json` (or in-browser storage) initialized with defaults | Auto   |
| FH2 | Settings update           | Changes persist immediately; can be exported when FS Access unavailable | Auto   |
| FH3 | Settings corruption       | Defaults regenerated; **modal informs user**                            | Auto   |
| FH4 | Folder relocation         | Relative paths continue to work; no broken references                   | Manual |
| FH5 | Permission denied         | App triggers **Save-As** export/import flow; no dead-ends               | Manual |
| FH6 | Export/import cycle       | Exported settings re-import cleanly; state matches                      | Manual |
| FH7 | Fallback storage path     | localStorage/IndexedDB path works without FS Access                     | Auto   |
| FH8 | Corrupted persisted state | Validation fails → reset to known-good default with **modal**           | Auto   |

---

## 5. Theme Tests

| ID  | Description                     | Expected Result                                                         | Type   |
| --- | ------------------------------- | ----------------------------------------------------------------------- | ------ |
| T1  | Valid theme load                | Theme applies immediately                                               | Auto   |
| T2  | Hot re-theming (runtime switch) | Visual change occurs **without** state loss (layout/marks/Bingo intact) | Auto   |
| T3  | Missing CSS/asset               | **Modal error**; revert to last-good theme                              | Auto   |
| T4  | Malformed `theme.json`          | **Modal error**; revert to last-good theme                              | Auto   |
| T5  | Remote URL attempt              | Refused; **modal** explains local-only policy                           | Auto   |
| T6  | Theme metadata display          | Theme name/preview appear in UI as designed                             | Manual |
| T7  | High-contrast theme             | Meets WCAG AA contrast thresholds                                       | A/M    |

---

## 6. Accessibility & UX Tests

| ID  | Description                 | Expected Result                                                                                                             | Type   |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | Keyboard grid navigation    | Arrow keys move focus across 5×5; Space/Enter toggles mark; Tab order sensible                                              | Auto   |
| A2  | Modal focus trap & escape   | Focus trapped inside dialog; Esc closes; focus returns to invoker                                                           | Auto   |
| A3  | ARIA roles and states       | Grid uses `role="grid"/`gridcell``; `aria-selected`mirrors mark state; buttons labeled; dialogs`role="dialog"`+`aria-modal` | Auto   |
| A4  | Screen reader announcements | Live region announces **Bingo Achieved** and error modal titles                                                             | Manual |
| A5  | Contrast verification       | All text/marker visuals ≥ 4.5:1 contrast                                                                                    | Auto   |
| A6  | Responsive layout sanity    | Grid and controls render correctly at common laptop/tablet widths                                                           | Manual |
| A7  | Visible focus indicators    | All interactive elements show visible focus outlines                                                                        | Auto   |

---

## 7. Error Handling & Validation UX

| ID  | Description            | Expected Result                                                  | Type   |
| --- | ---------------------- | ---------------------------------------------------------------- | ------ |
| E1  | Invalid encoding list  | Modal “Invalid File Encoding”; refuse to load                    | Auto   |
| E2  | Corrupted theme CSS    | Modal “Theme Load Failed”; revert to last-good                   | Auto   |
| E3  | Corrupted app state    | Modal “State Reset to Default”; app recovers to known-good       | Auto   |
| E4  | Console independence   | No user-critical info hidden solely in console                   | Auto   |
| E5  | Reset flow             | Clear All → Confirm cleared state; Free remains marked           | Auto   |
| E6  | Permission denial loop | Repeated denies always route to Save-As dialog; never block user | Manual |

---

## 8. Security & Content Hygiene

| ID  | Description                 | Expected Result                                                    | Type |
| --- | --------------------------- | ------------------------------------------------------------------ | ---- |
| S1  | Theme JS injection attempts | Rejected and surfaced via modal; no script execution               | Auto |
| S2  | Remote asset references     | Blocked; modal warns about local-only policy                       | Auto |
| S3  | JSON sanitization           | Schema validation strict; unexpected fields ignored/refused safely | Auto |
| S4  | Network access              | No external requests are made (local-only)                         | Auto |

---

## 9. Regression Checklist (Release Gate)

- [ ] Persisted state survives **refresh** and **restart**
- [ ] Free cell always marked and **non-toggleable**
- [ ] Validation failures produce **modals**; board remains unchanged
- [ ] Word list normalization (trim/dedupe; no emoji/control chars) enforced
- [ ] Theme switch is **instant** and preserves state
- [ ] Accessibility: keyboard, focus trap/return, ARIA states, contrast (AA)
- [ ] Export/import and Save-As fallback flows work cleanly
- [ ] No remote URLs or network calls; JSON/theme input sanitized

---

## 10. Tooling Notes

- **Automated:** Playwright (E2E DOM/state), Jest/Vitest (logic), axe-core (a11y).
- **Manual:** Visual checks (layout/contrast), permission prompts, screen reader flows (NVDA/VoiceOver), modal look & feel.
- **Artifacts:** Logs, screenshots, traces under `/test_results/` per run.

---

## 11. Document Metadata

**Version:** 1.2  
**Aligned With:** _Bingo_App_PRD_v1.2_  
**Maintained By:** Kevin Harlan  
**Scope Note:** Cross-browser and performance tests intentionally omitted.
