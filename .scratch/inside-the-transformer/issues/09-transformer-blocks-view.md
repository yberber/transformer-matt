# 09: Transformer blocks view

**What to build:** The user steps through all 12 layers one at a time. For each layer the view shows its attention part (a summary linking to the attention heatmap for that layer) and its MLP part (how strongly the MLP changed each Position), plus a logit lens: the top-5 tokens the model would predict at the last Position if it stopped at this layer. The Trace gains per-layer MLP impact and logit-lens top-5. See spec: Trace, Web app (transformer-block view).

**Blocked by:** 08

**Status:** ready-for-agent

- [x] Position records carry per-layer MLP impact (norm of the MLP output relative to the residual stream) and per-layer logit-lens top-5
- [x] The view steps through layers 1–12 with keyboard-operable controls; the layer is in the query string
- [x] Each layer shows an attention summary linking to the heatmap at that layer, MLP impact per Position, and the logit-lens top-5 at the last Position
- [x] Details show exact MLP-impact values and logit-lens probabilities
- [x] The view is added to the axe checks
- [x] pytest: logit-lens tokens match an independent Hugging Face computation
- [x] Each Example file stays under 300 KB brotli-compressed
- [x] Playwright: "step through layers"

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Trace shape.** Each position record gains two fields:
  - `mlp_impact`: float32 base64, one value per layer: ‖MLP output‖ / ‖residual stream it is added to‖. That residual is the stream as it leaves attention, i.e. the input of `ln_2`. "Relative to the residual stream" in the spec could also mean the stream after the MLP; the schema comment records the choice.
  - `logit_lens`: a list of `n_layer` `TopTokens` of 5 each: `lm_head(ln_f(block output))`, softmaxed. After layer 12 it equals the first 5 predictions (pytest checks this).
  - The `Trace` validator now also checks both lengths against `n_layer`.
  - The core records everything with forward hooks (`_recording_layers`) during the same passes that build the Trace, so the KV-cache Steps line up per Position.
- **Size.** Brotli sizes went from 61–199 KB to 74–233 KB (moon 233 KB, stray-dog 231 KB). Precision was not reduced. About 67 KB is left for the longest Example.
- **Tests.**
  - pytest checks the logit lens against `output_hidden_states` (with `ln_f` applied to every layer but the last, whose hidden state already has it), with near-tie swaps allowed.
  - It checks MLP impact within 1e-5 relative, with the residual built as block input + attention output. That is a different path from the core's `ln_2` hook.
  - Playwright `e2e/blocks.spec.ts` covers "step through layers" and a phone-width layout with axe. The Blocks URL in `MAIN_VIEWS` now carries `layer=4`.
- **View** (`web/src/lib/blocks/`).
  - `LayerControls`: previous and next buttons and a rail of 12 layer buttons (6 per row below 640 px), each showing that layer's top logit-lens guess at the last Position, so the guess can be watched forming. Changing the layer replaces the history entry, and `layer` is shared with the attention view.
  - `BlocksView` stacks the parts in model order:
    1. Attention: the last Position's 3 most looked-at tokens, averaged over the heads, and a link to the heatmap at this layer.
    2. MLP: one meter per Position on a fixed 0–100% scale, where ▲ marks values over 1. GPT-2's first-layer MLP and the first token often exceed it.
    3. The logit lens top-5, bars on an absolute 0–100% scale.
  - Details show the exact impacts and logit-lens probabilities to 6 decimals.
  - `PendingView` and its `view.pending` and `config.*` messages are gone, because every view is now built. Ticket 10 can add what it needs.
- **Left for later.**
  - The ranked-bar row (token chip, bar, percent) now exists in AttentionRanked, PredictionView and BlocksView. It is a candidate for a shared component if a fourth copy appears.
  - There are no keyboard shortcuts for layers in Blocks; the buttons are keyboard-operable.
