# Dependency Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the dev toolchain to the versions in [Target versions](#target-versions), clear
`npm audit`, track the lockfile, and leave `lint`, `format:check` and a new `test` script green.

**Architecture:** Every package in `package.json` is a `devDependency`; the shipped app
(`bingo_app.html` plus `js/`, `css/`, `themes/`) loads no npm code at runtime. Risk is confined to
the lint/format gate and to the source edits in Tasks 1 and 2. Task 1 restores a green baseline on
the current toolchain, Task 2 makes the behavior change ESLint 10 requires (with the repo's first
tests), Task 3 upgrades.

**Tech Stack:** ESLint flat config (`eslint.config.js`), Prettier (`.prettierrc`), `node:test`
(built into Node, no new dependency).

**Spec:** `~/Downloads/mybingo-deps-export.md` (dependency report).

## Findings

Checked on 2026-10-15 against the local checkout. Each row names its source; re-run the command
rather than trusting a copied result.

| ID  | Finding                                                                                                                                                                                                                     | Source                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| F1  | The gate is already red before any upgrade: lint fails on an unused function and `format:check` fails on files that drifted from `.prettierrc`.                                                                             | `npm run lint`; `npm run format:check`                                                                              |
| F2  | The report omits `npm audit` advisories. Every advisory shown on 2026-10-15 was in a transitive dev dependency (reached through `eslint` or `eslint-plugin-import`) with a fix available.                                   | `npm audit`; `npm ls <package>` for each advisory's package                                                         |
| F3  | `eslint-plugin-import` blocks ESLint 10: its peer range excludes it, and `npm install eslint@10` fails with `ERESOLVE`.                                                                                                     | `npm view eslint-plugin-import peerDependencies`                                                                    |
| F4  | `eslint-plugin-import` and `.eslintrc.json` have never been in effect. ESLint 9 reads only the flat config, which doesn't load the plugin. Both config files arrived in the first commit. ESLint 10 drops eslintrc support. | `eslint.config.js` imports; `git log --diff-filter=A -- .eslintrc.json eslint.config.js`; ESLint 10 migration guide |
| F5  | ESLint 10's `recommended` set adds `preserve-caught-error`, which fails the network-error `catch` blocks in `fetchThemeMetadata` and `fetchCss` (`js/theme/loader.js`): they throw a new `Error` without the caught one.    | ESLint 10 migration guide; `npx eslint js/theme/loader.js` after Task 3 Step 1 without Task 2                       |
| F6  | There is no test suite, although `CONTRIBUTING.md` ("Commands" section) tells contributors to run `npm run test`.                                                                                                           | `package.json` `scripts`                                                                                            |
| F7  | `package-lock.json` is gitignored, so pinned versions and audit fixes exist only in this machine's `node_modules`.                                                                                                          | `git check-ignore -v package-lock.json`                                                                             |

Upgrade compatibility, each checked in a scratch copy with the target versions installed (lint,
format and tests all passed there):

- `globals` 17 breaking changes: [v17.0.0 release notes](https://github.com/sindresorhus/globals/releases/tag/v17.0.0).
  Lint passing on `js/` with `globals.browser` is the check.
- ESLint 10 breaking changes, Node floor and config lookup: [migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0).
  This repo has one root `eslint.config.js`, so per-file config lookup changes nothing.
- `eslint-config-prettier` compatibility: `npm view eslint-config-prettier peerDependencies`.
- Prettier 3.6.2 → 3.9.10: replaying Task 1 then Task 3 Step 1, `npx prettier --write .` changed no
  tracked file.

## Decisions

**D1. Commit `package-lock.json`: yes (agreed 2026-10-15).** The app is at v1.0.0 with release
notes, and the `.gitignore` comment above the `package-lock.json` entry says to restore it once the
project stabilizes. Tracking it resolves F7. Task 3 Step 8 does this.

**D2. Commit this plan on the branch: yes (agreed 2026-10-15).** Task 1 Step 6 adds it.

**D3. `js/io/wordlist.js` keeps its current error shape (agreed 2026-10-15).** See Out of Scope.

## Global Constraints

### Target versions

The single source for versions in this plan:

| Package                  | Target                     |
| ------------------------ | -------------------------- |
| `eslint`                 | `^10.12.0`                 |
| `@eslint/js`             | `^10.0.1`                  |
| `globals`                | `^17.13.0`                 |
| `prettier`               | `^3.9.10`                  |
| `eslint-config-prettier` | unchanged (`^10.1.8`)      |
| `eslint-plugin-import`   | removed (F3, F4)           |
| Node (`engines.node`)    | ESLint 10's `engines.node` |

### Rules

- No new runtime or dev dependencies; tests use the built-in `node:test`.
- The app stays offline/local-only (`CONTRIBUTING.md`, "Ground Rules"); nothing under `js/` imports
  npm packages.
- Gate: `./before_commmit.sh` exits 0 at the end of every task. Task 2 adds `npm test` to it.
- Commits: imperative subject, a body saying what changed and why, and the co-author trailer the
  executing agent's harness specifies (if any). Work on branch `chore/dependency-remediation`, not
  `main`.

## Review Focus

1. **Theme switching after the Prettier rewrite of theme files.** A user picking any theme must
   still get the themed board; reformatting must not change JSON values or CSS selectors. Covered
   by the JSON check in Task 1 Step 4 and the browser smoke in Task 1 Step 5 / Task 3 Step 7.
2. **Theme load failure messages.** Adding `cause` must not change the user-visible `message`. The
   tests in Task 2 assert the exact message string as well as the cause.
3. **Fresh-clone install.** `npm ci` from the lockfile in the working tree (after Task 3 Step 8)
   must succeed on a clean copy with no `ERESOLVE`. Covered by Task 3 Step 9.
4. **Node versions at the bottom of the `engines` range.** `npm test` uses bare `node --test`
   (default file discovery) because the glob form isn't documented for every Node line the range
   allows. Only Node 24 was available to check; on an older line, `npm test` is the check. Mention
   the `engines` floor in the PR body for editor ESLint extensions that run their own Node.
5. **`designer/` or `themes/` gaining `.js` files later.** The flat config lints them under browser
   globals. That is today's behavior, unchanged by this plan; the `.eslintrc.json` ignore patterns
   were never in effect (F4).

---

### Task 1: Restore a green lint/format baseline on the current toolchain

Deliverable: `./before_commmit.sh` exits 0 on the currently installed toolchain, with dead config,
the unused plugin and the dead helper removed. This separates pre-existing debt (F1, F4) from the
upgrade so Task 3's diff holds only the upgrade.

**Files:**

- Modify: `js/theme/loader.js` (delete function `ensureThemeAttribute`)
- Delete: `.eslintrc.json`
- Modify: `package.json` (drop `eslint-plugin-import`)
- Reformat with Prettier, no hand edits: every file `npm run format:check` lists in Step 1
- Add: `docs/dependency_remediation_implementation_plan.md` (D2)

**Interfaces:** none consumed or produced. `ensureThemeAttribute` (singular) has no callers; the
live helper is `ensureThemeAttributes` (plural).

- [ ] **Step 1: Branch and record the red baseline**

```bash
git switch -c chore/dependency-remediation
npm run lint
npm run format:check 2>&1 | tee .git/format_drift.txt
```

Expected: lint's only error is `no-unused-vars` for `ensureThemeAttribute` in `js/theme/loader.js`.
`format:check` lists drifted files; `.git/format_drift.txt` is the file list for Steps 4 and 6. If
lint shows any other error, stop and report.

- [ ] **Step 2: Delete the dead function**

Confirm it has no callers (the word-boundary match excludes the plural helper):

```bash
grep -rnw "ensureThemeAttribute" js/
```

Expected: one hit, the function's own definition. Delete that function (its whole body and the
blank line after it) from `js/theme/loader.js`:

```js
function ensureThemeAttribute(doc, themeId) {
  if (!doc?.documentElement) {
    return;
  }
  doc.documentElement.setAttribute("data-theme", themeId);
}
```

Run: `npm run lint` → exit 0.

- [ ] **Step 3: Remove the dead eslintrc and unused plugin**

```bash
git rm .eslintrc.json
npm uninstall eslint-plugin-import
npm run lint
```

Expected: lint exits 0; `jq .devDependencies package.json` has no `eslint-plugin-import`.

- [ ] **Step 4: Apply Prettier (format-only)**

```bash
npx prettier --write .
npm run format:check
git status --short
```

Expected: `format:check` exits 0. `git status --short` shows the files from
`.git/format_drift.txt`, the Step 2-3 changes, and the untracked plan file, and nothing else. Then
confirm theme JSON values are unchanged:

```bash
for f in themes/*/theme.json; do
  diff <(git show HEAD:$f | jq -S .) <(jq -S . $f) >/dev/null && echo "same: $f" || echo "CHANGED: $f"
done
```

Expected: no `CHANGED:` line.

- [ ] **Step 5: Browser smoke**

```bash
npx --yes http-server -c-1 -p 8080 . >.git/http-server.log 2>&1 &
echo $! > .git/http-server.pid
```

Open `http://localhost:8080/bingo_app.html`. The board must render. In the toolbar's Theme select
(`data-action="theme-select"` in `bingo_app.html`), choose every option in turn. That list is
`DEFAULT_THEME_OPTION` and `BUILT_IN_THEME_ENTRIES` in `js/ui/view.js` plus every folder discovered
under `themes/`. Each choice must restyle the board with no console errors. Then:

```bash
kill "$(cat .git/http-server.pid)"
```

- [ ] **Step 6: Commit (the format-only diff gets its own commit)**

```bash
git add js/theme/loader.js package.json docs/dependency_remediation_implementation_plan.md
git commit  # subject: "Remove dead eslintrc, unused import plugin and dead helper"
            # body: .eslintrc.json and eslint-plugin-import were never read by the flat config
            # (F4); ensureThemeAttribute was superseded by ensureThemeAttributes. Adds this plan.
git add $(grep -o '^\[warn\] [^ ]*$' .git/format_drift.txt | cut -d' ' -f2)
git commit  # subject: "Apply Prettier to files that drifted from the configured style"
            # body: format-only; restores a green format:check before the toolchain upgrade
git status --short
```

Expected: `git status --short` prints nothing.

---

### Task 2: Preserve the original error as `cause` in theme loading, with the repo's first tests

Deliverable: the network-failure errors from `fetchThemeMetadata` and `fetchCss` carry the caught
error as native `Error.cause` (F5). `npm test` exists (F6). This is done on the current toolchain
so the behavior change is reviewed on its own.

**Files:**

- Create: `tests/theme_loader.test.js`
- Modify: `js/theme/loader.js` (the `catch (error)` blocks around `fetchImpl(...)` in
  `fetchThemeMetadata` and `fetchCss`)
- Modify: `package.json` (`scripts.test`)
- Modify: `before_commmit.sh`

**Interfaces:**

- Consumes: `createThemeLoader(options)` (uses `options.document`, `options.fetch`) and
  `fetchThemeMetadata(fetchImpl, url, themeId)`, both exported from `js/theme/loader.js`. Read
  `createThemeLoader` and `load` to confirm which `document` members are used before `fetchCss`
  runs; the fake document in the test provides exactly those.
- Produces: `npm test`, used by Task 3.

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add:

```json
"test": "node --test"
```

Bare `node --test` uses Node's default test-file discovery, which matches `*.test.js` and skips
`node_modules`
([v20 docs](https://nodejs.org/docs/latest-v20.x/api/test.html#running-tests-from-the-command-line)).
It takes no argument, so it avoids the glob form, which the v20 docs don't describe.

- [ ] **Step 2: Write the failing tests**

Create `tests/theme_loader.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { createThemeLoader, fetchThemeMetadata } from "../js/theme/loader.js";

function createFakeDocument() {
  return {
    documentElement: {
      setAttribute() {},
      removeAttribute() {},
    },
  };
}

test("fetchThemeMetadata keeps the network error as cause", async () => {
  const networkError = new TypeError("Failed to fetch");
  const failingFetch = async () => {
    throw networkError;
  };

  await assert.rejects(fetchThemeMetadata(failingFetch, "./themes/x/theme.json", "x"), (error) => {
    assert.equal(error.message, 'Theme "x" metadata request failed: Failed to fetch');
    assert.equal(error.cause, networkError);
    return true;
  });
});

test("theme loader keeps the CSS network error as cause", async () => {
  const networkError = new TypeError("Failed to fetch");
  const fetchImpl = async (url) => {
    if (url.endsWith("theme.json")) {
      return {
        ok: true,
        json: async () => ({ name: "X", version: "1.0.0", css: "theme.css" }),
      };
    }
    throw networkError;
  };
  const loader = createThemeLoader({ document: createFakeDocument(), fetch: fetchImpl });

  await assert.rejects(loader.load("x"), (error) => {
    assert.equal(error.message, 'Theme "x" CSS request failed: Failed to fetch');
    assert.equal(error.cause, networkError);
    return true;
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: non-zero exit. Every test in `tests/theme_loader.test.js` fails on its `error.cause`
assertion (the message assertions pass, which pins the current message text).

- [ ] **Step 4: Attach `cause` at both throw sites**

Use the native `Error` options bag. (`WordListError` in `js/io/wordlist.js` stores a `cause` in
its own `details` object, a different mechanism; don't copy it.) In `fetchThemeMetadata`:

```js
  } catch (error) {
    throw new Error(`Theme "${themeId}" metadata request failed: ${error?.message ?? error}`, {
      cause: error,
    });
  }
```

In `fetchCss`:

```js
  } catch (error) {
    throw new Error(`Theme "${themeId}" CSS request failed: ${error?.message ?? error}`, {
      cause: error,
    });
  }
```

Leave the bare `catch {` blocks (invalid JSON, unreadable CSS) unchanged: they bind no error, so
`preserve-caught-error` doesn't apply.

- [ ] **Step 5: Run the gate**

```bash
npm test && npm run lint && npm run format:check
```

Expected: all exit 0. If `format:check` flags the test file, run `npx prettier --write tests` and
re-run.

- [ ] **Step 6: Add tests to the pre-commit script**

`before_commmit.sh` becomes:

```bash
#!/bin/bash

npm run lint && npm run format:check && npm test
```

Run: `./before_commmit.sh` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add tests/theme_loader.test.js js/theme/loader.js package.json before_commmit.sh
git commit  # subject: "Preserve underlying error as cause in theme loader"
            # body: network failures in fetchThemeMetadata/fetchCss dropped the caught error;
            # attach it as native Error cause. Adds a node:test harness and npm test, which
            # CONTRIBUTING.md already referenced. Required by ESLint 10 preserve-caught-error.
git status --short
```

Expected: `git status --short` prints nothing.

---

### Task 3: Upgrade the toolchain, clear the audit, track the lockfile

Deliverable: every package at its [Target versions](#target-versions) entry; `npm audit` clean;
`engines` set; lockfile tracked (D1); gate green.

**Files:**

- Modify: `package.json` (`devDependencies`, new `engines`)
- Modify: `CHANGELOG.md`
- Modify: `.gitignore`
- Add: `package-lock.json`

**Interfaces:** consumes `npm test` from Task 2. `eslint.config.js` is expected to need no change;
Step 5's lint run is the check.

- [ ] **Step 1: Install the targets**

```bash
npm install -D eslint@^10.12.0 @eslint/js@^10.0.1 globals@^17.13.0 prettier@^3.9.10
npm ls --depth=0
```

Expected: no `ERESOLVE`; the `npm ls` tree matches [Target versions](#target-versions). An
`ERESOLVE` naming `eslint-plugin-import` means Task 1 Step 3 was skipped.

- [ ] **Step 2: Record the Node floor**

Add an `engines` object to `package.json` (top level, after `"type"`) whose `node` value is the
exact output of:

```bash
npm view eslint@10.12.0 engines.node
```

- [ ] **Step 3: Clear the audit**

```bash
npm audit fix
npm audit
```

Expected: `npm audit` exits 0. Never use `npm audit fix --force`; if anything remains, stop and
report the `npm audit` output.

- [ ] **Step 4: Check Prettier 3.9 against the tree**

```bash
npx prettier --write .
git status --short
```

Expected: only `package.json` is modified. Any other file means Prettier 3.9 formats differently
from 3.6.2 there; review and include that diff in this task's commit.

- [ ] **Step 5: Run the gate**

```bash
./before_commmit.sh
```

Expected: exit 0. A lint error from a rule new in ESLint 10's `recommended` set means a site Task 2
didn't cover; stop and report it.

- [ ] **Step 6: Changelog**

Add above the `## [1.0.0]` heading in `CHANGELOG.md`:

```markdown
## [Unreleased]

### Changed

- Dev toolchain upgraded to ESLint 10, `@eslint/js` 10, `globals` 17 and Prettier 3.9; see
  `engines` in `package.json` for the minimum Node version.
- Theme loader keeps the underlying network error as `cause` when a theme fails to load.

### Removed

- Unused `eslint-plugin-import` dependency and the `.eslintrc.json` file, which ESLint's flat
  config never read.

### Added

- `npm test` (Node's built-in test runner) with theme loader error tests.
- `package-lock.json` is now tracked so installs are reproducible.
```

Run `npm run format:check` → exit 0.

- [ ] **Step 7: Browser smoke**

Repeat Task 1 Step 5.

- [ ] **Step 8: Track the lockfile (D1)**

In `.gitignore`, delete the `package-lock.json` entry and the comment line directly above it about
adding it back. Then:

```bash
git check-ignore package-lock.json || echo "not ignored"
```

Expected: `not ignored`.

- [ ] **Step 9: Clean-install check**

Copies tracked and untracked-but-not-ignored files (so the working-tree lockfile is included) into
a fresh directory and installs from it:

```bash
S=$(mktemp -d) && git ls-files -co --exclude-standard | tar -cf - -T - | tar -xf - -C "$S" \
  && (cd "$S" && npm ci && ./before_commmit.sh && npm audit)
```

Expected: every command exits 0.

- [ ] **Step 10: Commit**

```bash
git add package.json CHANGELOG.md .gitignore package-lock.json
git commit  # subject: "Upgrade lint/format toolchain to ESLint 10 and Prettier 3.9"
            # body: versions per the plan's Target versions; npm audit clean (advisories were
            # transitive dev deps); engines floor from ESLint 10; lockfile now tracked (D1)
git ls-files package-lock.json
git log --format='%h %s%n%b' main..HEAD
git status --short
```

Expected: `git ls-files` prints `package-lock.json`; every commit in the log has a body;
`git status --short` prints nothing.

## Out of Scope

- `WordListError` (`js/io/wordlist.js`) passes `cause` inside its `details` object rather than as
  native `Error.cause`. Lint doesn't flag it; changing it is a separate behavior change (D3).
- Renaming `before_commmit.sh` (misspelled); raise separately.
- `CONTRIBUTING.md` "Preflight" section suggests a global `eslint -v` rather than `npx eslint -v`.
- Adding CI or Dependabot. The lockfile tracked by D1 makes either straightforward later.
