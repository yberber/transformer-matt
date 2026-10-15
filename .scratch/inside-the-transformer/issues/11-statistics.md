# 11: Statistics: per-token and per-layer Estimates

**What to build:** The user sees estimated FLOPs per token split into prefill and decode, a breakdown by component (QKV and output projections, attention scores, MLP, embeddings, LM head), a per-layer view as one stacked bar with "×12" and a toggle to show all 12, and totals for the current text (prefill of the Prompt plus decode of each Step taken). Every figure is labelled as a theoretical Estimate. A static "How we calculate" page documents every formula and what is excluded. See spec: Web app (Estimates module, statistics).

**Blocked by:** 05, 10

**Status:** ready-for-agent

- [x] The Estimates module computes FLOPs by the spec's counting rule: matrix multiplications only at 2 FLOPs per multiply-add; softmax, LayerNorm, GELU and residual adds excluded; embedding lookup as 0 FLOPs; LM head in full; attention following the causal mask exactly
- [x] The Estimates module computes KV-cache bytes assuming float32
- [x] The statistics view shows prefill and decode FLOPs per token, the component breakdown, and totals for the current Example and Step
- [x] The per-layer view is one stacked bar with "×12" and a toggle to show all 12
- [x] Embeddings appear as 0 FLOPs with an explanation; excluded operations are listed
- [x] Every figure is labelled as a theoretical Estimate and links to "How we calculate"
- [x] A static "How we calculate" page documents all formulas and exclusions in all three languages
- [x] The views are added to the axe checks
- [x] Vitest: hand-computed GPT-2 reference values for prefill and decode FLOPs, per component and KV-cache bytes
- [x] Vitest: prefill cost equals the sum of decode costs at each prefix length

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Estimates module** (`web/src/lib/estimates/`):
  - **`flops.ts`** counts matrix multiplications only, at 2 FLOPs per multiply-add.
    - `decodeFlops(config, n)` is one token reading n Positions, itself included.
    - `prefillFlops(config, P)` is a Prompt of P tokens.
    - `textFlops(config, P, s)` returns `{ prefill, decode, total }`: the Prompt's prefill, the s Steps' decodes (reading P+1 … P+s Positions), and both together.
    - Each `Flops` has `perLayer` (`qkv`, `scores`, `weightedSum`, `outputProjection`, `mlp`), `layer`, `layers`, `components` (adds `embeddings` = 0 and `lmHead`, the latter on every Position) and `total`.
    - Everything is a closed form (no loop over Positions), so ticket 12 can call it for 1 … 1024 cheaply.
  - **`kvCache.ts`**: `kvCacheBytes(config, n)` returns `keys`, `values` and `perLayer` (one layer's), plus `layers` and `total`, all as float32. Ticket 19 can use the per-layer K and V directly.
  - **Tests.** `web/tests/flops.test.ts` and `kvCache.test.ts` check hand-computed GPT-2 values. They also check that prefill equals the sum of decodes at each prefix length, for the total and every component, up to 1024.
- **Pages.** `PAGES` is now `architecture`, `statistics` and `calculate`, all linked from `PageLinks`.
  - `view=statistics` needs a Trace, while `view=calculate` does not, like the architecture page.
  - `ViewFrame` takes `atStep` so a page can show "Step k of N"; statistics does.
- **Statistics view** (`web/src/lib/statistics/`):
  - **Per token.** Prefill is shown per Prompt token as the average, prefill(P)/P. Decode is shown for *the next token*, decode(P+s+1), because the Next control triggers that decode.
  - **Totals** for the text so far: prefill, decodes, total, and the KV cache for the P+s Positions held.
  - **Component table.** Columns are per Prompt token, next token, text so far, and share. Below it: embeddings at 0 with an explanation, the LM head counted in full, and what is excluded.
  - **Per layer** (`LayerBars.svelte`): one stacked bar of one layer's share of the text so far, ×12, with a legend. A disclosure button (`aria-expanded`) draws all 12 to the same scale.
  - **Details**: every Estimate as an exact integer.
- **Formatting and color.**
  - Figures use `flopsText`/`bytesText` in `statistics/format.ts`: 3 significant digits in words via Intl compact-long ("247 million FLOPs", "2,97 Milliarden FLOPs"), and decimal kB/MB.
  - Block components take five token-palette hues (`statistics/colors.ts`), checked with the dataviz validator; see the comment there. Ticket 12 should reuse `COMPONENT_COLOR` so `scores` stays orange.
- **Estimate labelling.** Every figure group carries `EstimateLink`, visibly "Theoretical Estimate", named "Theoretical Estimate: how we calculate". It links to `view=calculate`, with no fragment, because the fragment is reserved for Live mode (ADR 0002).
- **"How we calculate"** (`HowWeCalculateView.svelte`, static, all three languages):
  - It documents the counting rule, the symbols, a per-layer table, embeddings and LM head, decode(n), prefill(P), the text so far, the KV cache and the exclusions. The exclusions are softmax (with 1/√64 scaling and the mask), LayerNorm, GELU, residual adds and bias adds.
  - Every number comes from the module. The fixed and per-Position parts are `decodeFlops` at n = 0 and n = 1. The symbolic formulas are written in the component.
  - Ticket 20 adds the slider there.
- **Deviations to know about.**
  - Attention appears as two components, scores (QKᵀ) and weighted sum (A·V), both growing with n. The spec lists "attention scores" as one.
  - Bias adds are listed as excluded on top of the spec's four.
  - The statistics page already shows the KV-cache total for the current context. Ticket 19 adds the per-layer view.
  - "How we calculate" also gets a link in the page navigation.
  - Turkish renders Estimate as "Kestirim", not "Tahmin", because "Tahmin" is already the Predict stage. That needs native review (ticket 21).
- **Glossary gap.** "The text so far" (the Prompt plus the Steps taken) is used as a concept (`textFlops`) but is not in GLOSSARY.md.
