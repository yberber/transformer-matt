# 07: Embeddings view

**What to build:** The user sees each token's token embedding and position embedding as 768-dimension colored strips and sees that they are added before entering the first block. "Show details" shows the first 16 dimensions as exact values plus the vector norm, labelled as a truncated view. The Trace gains embeddings: int8 with a per-vector scale for the strips, plus the first 16 dimensions as float32. See spec: Trace, Web app.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Position records carry token and position embeddings as int8 with a per-vector scale, plus the first 16 dimensions as float32 and the norm
- [x] The view draws each vector as a colored strip, keyed to the token's Position color
- [x] The view shows the token and position embeddings being added
- [x] Details show the first 16 dimensions and the norm, labelled as a truncated view
- [x] The view is keyboard-usable, works on phone widths, and is added to the axe checks
- [x] pytest: the first 16 dimensions match an independent Hugging Face run within 1e-6
- [x] Each Example file stays under 300 KB brotli-compressed

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Trace shape.** Each position record gains `token_embedding` and `position_embedding`, each `{values, scale, first_dimensions, norm}`:
  - `values` is 768 int8 (base64), with `values[i] * scale ≈ x[i]` and `scale = max|x| / 127`.
  - `first_dimensions` is 16 exact float32 (base64).
  - `scale` and `norm` are float32 JSON numbers, written as the shortest decimal that reads back as the same float32 (`Float32` in `trace.py`).
  - The vectors are the raw `wte`/`wpe` rows; their sum is not recorded.
- **Size.** Brotli sizes went from 4–8 KB to 31–77 KB (stray-dog 77 KB, moon 74 KB). Attention (08) has about 220 KB left for the longest Example.
- **Tests.**
  - The Hugging Face reference takes the token embedding from `get_input_embeddings()` and the first block's input from `hidden_states[0]`. The position embedding is their difference.
  - Checks: the first 16 dimensions within 1e-6 (the spec's tolerance), the int8 strips within half a step of the full vectors, and token + position adding up to `hidden_states[0]`.
  - Norms and scales use a relative 1e-5. That tolerance is not in the spec: a norm sums 768 squares, whose rounding depends on the CPU.
  - `assert_same_trace` lets an int8 value move by one step between machines.
- **View** (`web/src/lib/embed/`).
  - Each Position is one row: token embedding + position embedding = sum, all three drawn as strips. On phones (≤ 640 px) the strips stack with labels.
  - A strip is a 768×1 canvas stretched to its width. Positive values take the Position's color and negative ones `--ink-secondary`. Opacity is linear in |value| on one shared scale that saturates at 0.3, the 99th percentile of token-embedding values. This makes the position embeddings' few large outlier dimensions stand out against the faint rest.
  - Strips redraw on theme changes (`onThemeChange` in `theme.ts`), since canvas colors don't follow CSS variables.
  - The sum strip comes from the int8 values. The sum's first 16 dimensions in the details are exact (`Math.fround(a + b)`). Its norm is left out, because it would only be approximate.
  - The details also show token ID, raw bytes and both tables' shapes.
- **Accessibility.** The embed URL was already in `MAIN_VIEWS`. `e2e/embeddings.spec.ts` adds a phone-width layout and axe test. On a phone, axe flagged the details table's sideways scroll container (`scrollable-region-focusable`), so it is now a focusable, labelled region. The Tokenize and Predict tables use the same `.table-scroll` without this. They passed at desktop width, but nothing checks them on phones yet.
- **Not done here.** Animating the addition is left to the data-flow animations ticket (18).
