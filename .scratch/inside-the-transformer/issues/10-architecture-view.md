# 10: Architecture view and parameter counts

**What to build:** The user sees a diagram of the whole model with the 12 blocks drawn once with "×12" and can expand any block. Clicking any parameter tensor shows its shape, parameter count and share of total parameters. Every number comes from the official config through the Estimates module's parameter formulas, never typed by hand. The fused QKV matrix is shown as one 768×2304 matrix annotated as Q/K/V × 12 heads × 64, and the LM head is marked as tied to the token embedding and counted once. See spec: Web app (architecture view, Estimates module).

**Blocked by:** 04

**Status:** ready-for-agent

- [x] The Estimates module derives every parameter tensor's shape and count from the config
- [x] Clickable tensors: token embedding, position embedding, and per block both LayerNorms, fused QKV, attention output projection, MLP up and down projections, plus the final LayerNorm; weights and biases listed separately
- [x] Clicking a tensor shows shape, parameter count and share of total
- [x] Fused QKV carries the Q/K/V × heads × 64 annotation; the LM head is marked as tied and counted once
- [x] Blocks are drawn once with "×12", and any block can be expanded
- [x] The view is keyboard-usable, works on phone widths, and is added to the axe checks
- [x] Vitest: hand-computed reference values for each tensor, and a total of 124,439,808 parameters

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Estimates module** lives in `web/src/lib/estimates/`. Ticket 11 adds FLOPs and KV-cache bytes next to it.
  - `config.ts` bundles the official `public/data/gpt2-config.json` (the regeneration script's copy) as `GPT2_CONFIG`. It is under 1 KB, so a JSON import is used, not a fetch. A Vitest check keeps it equal to every Example header's `config`.
  - `parameters(config)` returns every tensor (`part`, `kind`, Hugging Face `name`, `shape`, `count`) for the embeddings, one block and the final LayerNorm. It also returns `perBlock`, the subtotals, `mlpWidth`, the QKV split (`heads`, `headWidth`) and `lmHead` (`lm_head.weight`, tied to `wte.weight`, counted once).
  - Shapes follow Hugging Face's GPT-2: Conv1D weights are inputs × outputs, so fused QKV is 768 × 2304.
  - The MLP width is fixed at 4 × n_embd: GPT-2's config leaves `n_inner` unset. Supporting `n_inner` was dropped in review as speculative.
  - `web/tests/parameters.test.ts` checks every tensor against values worked out by hand, and the total of 124,439,808.
- **Routing.**
  - `view=architecture` is a *page*: `PAGES` in `viewState.ts`, part of `VIEWS` but not of `STAGES`. `stageOf` returns `undefined` for pages, so the strip marks no station, and `ViewFrame` drops the "No. 0n" and "Step k of N" labels.
  - `PageLinks.svelte` (in the bench, after the Step controls) links to every page. **Ticket 11 adds `"statistics"` to `PAGES`** and gets the link, routing and frame for free.
  - `App.svelte` renders the architecture page without waiting for a Trace. The loaded Example's header only supplies the model revision for the "From the config of …" note.
- **View** (`web/src/lib/architecture/`).
  - The diagram runs top to bottom: token IDs in → Embeddings → Transformer block ×12 → after the blocks (final LayerNorm) → LM head → scores out, with the parameter total below.
  - The block is drawn once as a stacked card. Twelve `aria-expanded` buttons expand any one block, and its parts appear in model order with residual adds and GELU marked.
  - Every tensor is a toggle (`aria-pressed`, weight and bias separate). Choosing one opens a card right below its part (on a phone it appears where it was chosen) with its Hugging Face name (`h.4.attn.c_attn.weight`), shape, count, share of all parameters, and for block tensors the total over all 12 blocks. A visually hidden `role="status"` announces the same.
  - Shares use 3 significant digits, so a LayerNorm bias shows as 0.000617%.
  - Fused QKV carries `QkvMatrix`, an SVG to scale with Q | K | V each split into 12 head stripes of 64, plus a caption. The LM head button is dashed, tagged "tied", and its card names `wte.weight` and 0 added parameters.
  - Details show one table of every tensor with per-block and 12-block subtotals, `lm_head.weight` as "tied to wte.weight", and the total.
  - The shared tensor-button and card styles are global (`.tensor`, `.tensor-card` in `styles.css`).
- **Deviations to know about.**
  - The model diagram itself is HTML/CSS boxes, not hand-written SVG; only the QKV matrix is SVG. Native buttons reflow on phones and pass axe, which an SVG of focusable `<g>` elements would make harder.
  - The expanded block and the chosen tensor are local state, not in the URL: the spec's view state lists example, view, layer, head, step and lang only. Reusing `layer` would force a block open on every visit.
- **Tests.**
  - `e2e/architecture.spec.ts` covers the whole interaction (link from the flow, ×12 collapsed, keyboard expand, QKV weight and bias, switching blocks, tied LM head, details table, reload) and a phone-width layout with axe (block expanded, card open).
  - The page is in `MAIN_VIEWS` for the four theme cases.

