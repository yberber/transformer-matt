# 06: Quality gates in CI

**What to build:** Performance and accessibility become enforced from here on: CI fails if Example mode's Lighthouse performance score drops below 90, if the initial page load exceeds 2 MB, or if axe finds violations on the main views. Later view tickets add their views to the axe checks. See spec: Testing Decisions (built site in a browser).

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [x] Lighthouse CI runs in Example mode and fails below a performance score of 90
- [x] CI fails when the initial page load exceeds 2 MB
- [x] axe checks run on every existing main view in both themes and fail on any violation
- [x] Adding a view to the axe checks is a one-line change, documented in the README

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- axe: `web/e2e/accessibility.spec.ts` checks each URL in `MAIN_VIEWS` in four theme cases, and expects no violations at all, best-practice rules included. The cases are light and dark as the system setting gives them (Playwright's `colorScheme`), and each theme picked with the toggle against the system setting. `styles.css` defines the dark tokens twice, once for `prefers-color-scheme` and once for `[data-theme="dark"]`, so both copies need checking. A contrast break in either copy fails only its own cases (both were tried). Every "Show details" on the page is opened first. A new view adds one URL there (see the README). The test waits for the first h2 and tolerates any number of "Show details", so separate pages (architecture, statistics) fit too.
- axe runs at the desktop viewport only. The narrow-screen attention layout (08) needs its own test with a phone-sized viewport.
- The first run found one violation, `region`: the Example picker and Step controls sat outside any landmark. `<main>` now starts below the masthead and holds them, the pipeline strip and the view.
- Lighthouse CI: `web/lighthouserc.cjs`, run by `npm run lighthouse` (builds first). It checks the landing page and `?example=moon` (the longest Example), three runs each with the median run asserted: performance at least 0.9 and `total-byte-weight` at most 2,000,000 bytes (decimal, like the 300 KB Example budget). Default mobile emulation and simulated throttling. Both assertions were tightened once to check that they fail the command.
- Today both URLs score 1.0 at about 42–47 KB transferred. LHCI's own static server gzips responses; Caddy will serve brotli, so the measured size is slightly pessimistic.
- Lighthouse runs on Playwright's Chromium with `--no-sandbox`, because Ubuntu 24.04 runners block the user namespaces Chrome's sandbox needs. Like the rest of the workflow, it has not run on GitHub yet.
