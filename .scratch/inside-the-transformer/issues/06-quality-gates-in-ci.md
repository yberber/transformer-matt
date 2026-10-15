# 06: Quality gates in CI

**What to build:** Performance and accessibility become enforced from here on: CI fails if Example mode's Lighthouse performance score drops below 90, if the initial page load exceeds 2 MB, or if axe finds violations on the main views. Later view tickets add their views to the axe checks. See spec: Testing Decisions (built site in a browser).

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] Lighthouse CI runs in Example mode and fails below a performance score of 90
- [ ] CI fails when the initial page load exceeds 2 MB
- [ ] axe checks run on every existing main view in both themes and fail on any violation
- [ ] Adding a view to the axe checks is a one-line change, documented in the README
