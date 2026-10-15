# 12: Context-length chart

**What to build:** The user sees how compute cost grows with context length, from 1 to 1024 (n_positions) on a logarithmic x-axis, with a marker at the current length. The chart makes visible that the attention-score share grows with context. See spec: Web app (statistics).

**Blocked by:** 11

**Status:** ready-for-agent

- [x] The chart plots Estimates from 1 to 1024 on a log x-axis using the shared Estimates module
- [x] A marker shows the current context length and moves as the user steps
- [x] The attention-score share is distinguishable from the rest
- [x] The chart has a text alternative, is labelled as a theoretical Estimate, and is added to the axe checks
- [x] The chart works on phone widths

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **What is plotted.** The chart shows the decode cost of one token reading n Positions, `decodeFlops(config, n)`, for n = 1 … 1024. It has two panels on the same log x-axis, as small multiples rather than a dual axis:
  - **FLOPs per token**, stacked as everything else (constant at 247,064,064), attention scores and the weighted sum.
  - **Attention's share** of those FLOPs. This panel was added in review because, on an absolute axis starting at 0, the scores band is under 1 px until about n = 64. The share panel is what makes the growth visible: scores reach 6.63% at 1024, and the two attention parts together 13.3%.
- **Marker** at the current length, P + s (`trace.positions.length`), on both panels. The statistics page's "Decode, the next token" figure reads P + s + 1, so the two differ by one Position. Both are labelled with their length.
- **Module** (`web/src/lib/statistics/contextChart.ts`):
  - **Data:** `contextCost(config, n)` and `contextCosts(config)`, both thin wrappers over the Estimates module's `decodeFlops`.
  - **Exact table lengths:** `exactLengths(max, current)` gives every doubling plus this text's length.
  - **Geometry:** `lengthScale` (log2), `lengthTicks` and `roundTicks`.
  - **Tests:** `web/tests/contextChart.test.ts` checks them with hand-computed values. Ticket 20's slider can reuse `contextCost` and `lengthScale`.
- **Reading the chart.** The SVG is a `role="slider"` (label "Read the chart at a context length") that only changes a readout below the plot; it does not touch the route.
  - Pointer: hover shows a crosshair.
  - Keys: arrows ±1, PageUp/PageDown ×2/÷2, Home/End.
  - This follows the dataviz rule that hover details must also be reachable by keyboard. It is separate from ticket 20's slider on "How we calculate".
- **Text alternative.** The figcaption summarises the range, the log scale, the constant part, the growth of the scores' share and this text's length. "Show details" has the table "One token's cost by context length, exactly", at every doubling and at this text's length.
- **Accessibility and phone.**
  - The statistics page was already in the axe checks (all four theme setups) and in the 375 px phone test, so the chart is covered there.
  - A new phone test keeps every SVG label inside the chart in en, tr and de. The y-axis margin is sized from the longest tick label, such as German "300 Mio.".
- **Deviations to know about.**
  - **No d3.** The spec allows "d3 modules only for scales and the cost chart". A log2 scale and round ticks were a few lines each, so no dependency was added.
  - **Unit tests for geometry.** The geometry is unit-tested as a pure TypeScript module, a seam agreed when the tests were planned. Svelte components are still only tested end to end.
- **Translations** for the new `stats.context*` and `stats.positions.*` keys are agent drafts (ticket 21).

