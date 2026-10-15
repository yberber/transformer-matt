# 19: KV-cache view

**What to build:** The user sees the KV cache for the current context: the size of each layer's K and V, growing as they step, with the total memory as a theoretical Estimate. See spec: Web app (Estimates module, "How we calculate").

**Blocked by:** 11

**Status:** ready-for-agent

- [x] The view shows per-layer K and V sizes and the total, from the shared Estimates module, assuming float32
- [x] The figures grow as the user steps, in both Example and Live mode
- [x] Every figure is labelled as a theoretical Estimate
- [x] The view is keyboard-usable, works on phone widths, and is added to the axe checks

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Where.** A section on the Statistics page, "KV cache, layer by layer", right after "This text so far" (agreed before implementing, rather than a page of its own). It is drawn by `web/src/lib/statistics/KvCacheLayers.svelte`.
- **What it shows.** Every number comes from `kvCacheBytes` in the Estimates module, assuming float32, and the section says so.
  - Figures: the Positions held, all 12 layers together, and what each new Position adds (73.7 kB).
  - All 12 layers as a list ("Keys and values in each layer"). Each item has a K strip and a V strip and its size as "K 52.2 kB · V 52.2 kB".
  - Strips have one cell per Position, in its Position color. They are drawn to the Positions this run can reach (the Prompt plus the run's Step limit: 16 for an Example, 64 in Live mode), so the room left shows as a dashed outline.
  - The strips are `aria-hidden`. Their content is in the text beside them.
  - "Show details" has "The KV cache, exactly": bytes per layer for K, V and both, with a total.
- **Estimate label.** The section heading carries `EstimateLink`, and the details open with one.
- **Props.** `StatisticsView` now takes `limit` (the run's last Step) from `App`, so it still does not read the route itself.
- **Tests.** Svelte components are tested end to end, as before.
  - `statistics.spec.ts`: "watch the KV cache grow, layer by layer" (village, Step 5 → 6, both the figures and the exact table).
  - `live-mode.spec.ts`: "the KV cache grows as Live mode steps" (12 → 13 Positions, run to 76).
  - Axe and the 375 px phone test already cover the Statistics page in all four theme setups.
- **Decisions and deviations.**
  - **Colors without token text.** The cells use Position colors without token text. styles.css allows the palette's low CVD floor only beside token text. The exception is recorded in the component: no cell's color carries meaning, and the count and sizes are written out.
  - **No motion.** A new cell appears instantly, because ticket 18 kept motion to the pipeline strip.
  - **No test on the strips' geometry.** Only the text and the exact table are asserted.
- **Translations** for the new `stats.kv*` keys are agent drafts (ticket 21).
- **Seen in passing.** `e2e/data-flow.spec.ts:51` reads the token chips right after `goto`, without waiting for the Example to load. It failed once in a full run and passed on every rerun.
