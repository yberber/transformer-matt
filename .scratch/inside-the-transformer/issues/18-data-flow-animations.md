# 18: Data-flow animations

**What to build:** Motion shows data moving between pipeline stages, so the user sees tokens flow through the apparatus from tokenization through the blocks to prediction. Motion is used only to explain data flow. With reduced motion enabled, every animation becomes an instant transition. See spec: Web app (visual direction).

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Moving between pipeline stages animates tokens flowing to the next stage, in their Position colors
- [ ] Appending a Step animates the new token entering the pipeline
- [ ] With reduced motion enabled, every animation becomes an instant transition
- [ ] Animations do not push Lighthouse performance below 90
- [ ] Playwright: with reduced motion emulated, stage changes complete without animation
