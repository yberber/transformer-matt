# 08: Attention view

**What to build:** The user sees a heatmap of which tokens attend to which, chooses any of the 12 layers and 12 heads, and reads exact weights in details. Keyboard users move between cells with arrow keys and hear "token A → token B: value" announced; `[` and `]` switch head quickly. On screens narrower than 640 px the heatmap becomes "choose a query token → ranked list of where it looks", with a small overview kept. An explanation covers why so much attention goes to the first token. Layer and head are in the URL. The Trace gains each Position's attention row for all 144 heads as uint8. See spec: Trace, Web app (attention heatmap), ADR 0003.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Position records carry that Position's attention row for every layer and head as uint8
- [x] The heatmap is drawn with Canvas and labels rows and columns with token text and Position colors
- [x] Native selects choose layer and head; `[` and `]` switch head
- [x] The heatmap is one focusable grid with arrow-key navigation and a polite live region announcing the focused cell
- [x] Below 640 px wide, a query-token chooser with a ranked bar list replaces the full heatmap, and a small overview remains
- [x] The attention-sink explanation is shown
- [x] Details show exact attention weights
- [x] layer and head are in the query string
- [x] The view is added to the axe checks
- [x] pytest: attention matches an independent Hugging Face run within 1/510
- [x] Each Example file stays under 300 KB brotli-compressed
- [x] Playwright: "change head"

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Trace shape.** Each position record gains `attention`: uint8, base64 (`application/x-uint8`), `round(weight × 255)`, laid out layer by layer, head by head, each row the weights from this Position to Positions 0 … itself. Position i holds 144 × (i + 1) values; a `Trace` validator checks the length against `n_layer × n_head` from the header.
  - The core loads GPT-2 with `attn_implementation="eager"`, because the default SDPA kernel returns no attention weights. Logits move by about 1e-4 against SDPA, well within the probability tolerance.
  - `Int8Array` and `UInt8Array` now come from one `_byte_array` factory in `trace.py`.
- **Size.** Brotli sizes went from 31–77 KB to 61–199 KB (moon 199 KB, stray-dog 199 KB). Ticket 09 (MLP impact and logit-lens top-5) has about 100 KB left for the longest Example. If it runs over, the spec says to reduce precision before dropping content.
- **Tests.**
  - pytest compares every row against one plain forward pass over the whole sequence (the core uses the KV cache), within 1/510 + 1e-6. The 1e-6 allows for a weight on a rounding boundary.
  - The `reference_model` fixture is now eager too, so one model serves predictions, embeddings and attention.
  - Regeneration lets a uint8 weight move by one step across CPUs, like int8 embeddings.
  - Playwright `e2e/attention.spec.ts` covers "change head" and a phone-width layout with axe. The wide view is in `MAIN_VIEWS`.
- **Routing.** `view=attention` is a view, not a pipeline station. `STAGES` (the strip) and `VIEWS` (every view) are now separate, and `stageOf` maps attention to Blocks, so the strip marks Blocks and the frame numbers it No. 03.
  - `layer` and `head` are in every URL, 1-based as the UI shows them. Changing them replaces the history entry, as Steps do. `LAYERS`/`HEADS` (12) in `viewState.ts` bound URL parsing, which runs before any Trace loads; the selects use the Trace header's config.
  - For now the Blocks placeholder links to the heatmap. **Ticket 09 should replace that link** with its per-layer attention summary.
- **View** (`web/src/lib/attention/`).
  - `HeatmapCanvas` draws one head as an n × n canvas, scaled up without smoothing. It is linear from `--paper-raised` to `--line`, and the masked future stays transparent over a hatch. The full heatmap and the phone overview both use it, and it redraws on theme changes (`cssRgb` moved to `theme.ts`, shared with `EmbeddingStrip`).
  - Row and column labels are HTML, aligned by CSS grid. Cells are at least 0.85rem, so long Examples scroll sideways between 640 px and about 1000 px rather than squashing labels.
  - Below 640 px (`width < 640px`), a native select chooses the query token and a top-10 ranked list follows, with the remaining share and a small overview whose chosen row is marked.
  - The sink note also gives the head's average share of attention on the first token.
- **Accessibility.**
  - The plot is one tab stop with `role="application"`, not an ARIA `grid`. A real grid needs a row and cell for every one of up to 2,080 cells. `application` makes screen readers pass arrow keys through, which is what the spec's "single focusable grid with … a polite live region" needs.
  - A visually hidden `role="status"` announces "token A (Position i) → token B (Position j): weight" on focus and on every move. `[`/`]` and the selects announce "Layer l, head h." first. `[`/`]` wrap within the layer and are ignored in text fields.
- **Details** show the exact weights (three decimals, enough to tell every k/255 apart) for the cursor's query row, not the whole matrix. This keeps them readable at 64 Positions. The cursor or the phone chooser picks the row.
