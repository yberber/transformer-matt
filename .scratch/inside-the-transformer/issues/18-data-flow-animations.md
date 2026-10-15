# 18: Data-flow animations

**What to build:** Motion shows data moving between pipeline stages, so the user sees tokens flow through the apparatus from tokenization through the blocks to prediction. Motion is used only to explain data flow. With reduced motion enabled, every animation becomes an instant transition. See spec: Web app (visual direction).

**Blocked by:** 09

**Status:** ready-for-agent

- [x] Moving between pipeline stages animates tokens flowing to the next stage, in their Position colors
- [x] Appending a Step animates the new token entering the pipeline
- [x] With reduced motion enabled, every animation becomes an instant transition
- [x] Animations do not push Lighthouse performance below 90
- [x] Playwright: with reduced motion emulated, stage changes complete without animation

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **What moves** (`web/src/lib/shell/PipelineStrip.svelte`):
  - **Stage flow.** Moving on to a later stage sends the whole sequence, in Position colors, through each tube between the old and the new station, one tube after another. Each tube takes 320 ms, so Tokenize → Predict takes about 1 s.
  - **New Step.** The new token, in its Position color, travels the return pipe from the outlet to the inlet (700 ms). It then slides into each tube in turn, and its slot stays empty until it arrives.
  - **No motion (decided here).**
    - Moving back to an earlier stage, entering a stage from a separate page, or moving within Blocks/Attention is an instant cut, because no data flows backward.
    - Going down Steps, switching Example and editing the Live Prompt also cut instantly.
    - Scrubbing forward several Steps at once animates only the last new token.
    - Back/Forward that changes the stage plays only the stage motion (forward) or nothing (back). It never plays the new-Step motion, because it revisits Steps rather than appending them. The code review caught this; it has a test.
- **How.**
  - Only CSS animations, so `styles.css`'s reduced-motion rule (`animation: none !important`) turns all of them off. The returning bead is `visibility: hidden` except while it animates.
  - No Svelte transitions are used. If one is added, its duration must be set to 0 under reduced motion (see 03).
  - Tubes and the return pipe are size containers, so keyframes use `cqi`/`cqw`/`cqh` to start one tube length back or follow the pipe.
  - Animations use `fill-mode: backwards` only, so they leave nothing behind in `document.getAnimations()` once they end.
  - A new motion re-keys the tubes' contents, which starts it.
- **Tests.** `web/e2e/data-flow.spec.ts` records `animationstart` targets inside the pipeline. It checks four things:
  - the flowing beads' colors match the view's token chips, Position by Position;
  - a new Step moves only the new token, in its chip's color;
  - Back across a stage that raises the Step does not animate;
  - with reduced motion emulated, stage changes and new Steps start no animation at all. Removing the `styles.css` rule makes this test fail.
- **Lighthouse.** Performance is 0.99 on the landing page and 0.96 on `?example=moon`, the same as before this change. Lighthouse measures only the initial load, and no animation runs on load. The animations only use `transform`, apart from `visibility` on the returning bead.
