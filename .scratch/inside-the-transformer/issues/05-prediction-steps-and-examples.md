# 05: Next-token prediction, Steps and the six Examples

**What to build:** The user picks one of six Examples (two short, two medium, two long), sees the top-10 next-token probabilities, and asks for the next token: the top-1 token is appended greedily and every view shows the extended sequence. The user can go back and forth with prev/next controls and a scrubber; the Step is in the URL. After 16 Steps the next control is disabled with an explanation. Hovering a Prompt token shows what the model predicted at that Position. The Trace gains per-Position top-10 predictions, and Examples are precomputed with 16 Steps. The agent drafts about 15 candidate Prompts and selects the six by the spec's rules. See spec: Examples, Trace, Web app (Step navigation).

**Blocked by:** 04

**Status:** ready-for-agent

- [x] The Trace's position records carry the top-10 next-token predictions (token and float32 probability)
- [x] The core can advance a Prompt by k greedy Steps, appending the top-1 token each time; Continuation text is never re-tokenized
- [x] Six English Examples are committed, two each in the bands short 8–12, medium 22–28, long 44–48 Prompt tokens, each with exactly 16 Steps
- [x] Each Example satisfies the selection rules: no repeated token 3-gram in its 16 Continuation tokens; top-1 exceeds top-2 by at least 0.001 at every Step (was 0.05, changed by the user, see Comments); no newline-only tokens and nothing offensive in the Continuation; the Prompt is text to continue, not a question
- [x] Among qualifying candidates the largest minimum margin is preferred, and at least one Example contains a word split into several tokens
- [x] An Example picker shows the six Examples labelled short, medium and long
- [x] The prediction view shows the top-10 probabilities and states that decoding is greedy
- [x] Prev/next controls and a scrubber move between Steps in every view; the Step is in the query string
- [x] The next control is disabled after Step 16 with an explanation
- [x] Hovering a Prompt token shows the prediction made at that Position
- [x] pytest: an independent Hugging Face greedy run matches each Example's tokens exactly and probabilities within 1e-4
- [x] pytest: each Example satisfies the selection rules
- [x] Each Example file stays under 300 KB brotli-compressed
- [x] Playwright: "generate next token"

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Selection rule changed by the user.** In four drafting rounds (about 45 Prompts), nothing but memorized boilerplate passed a 0.05 margin at all 16 Steps. That boilerplate was software licences, counting and weekday lists, and the Declaration of Independence. Ordinary prose always hit a near-tie or a newline loop somewhere. Strict largest-margin selection would have picked the MIT licence in all three bands. The user lowered the margin to 0.001, which still keeps every greedy choice clear of float differences between machines. They also asked for natural prose only (short stories, everyday facts), with no licence or legal texts and no counting or list sequences. spec.md records the change.
- **Selection is reproducible.** `uv run select-examples` (`python/src/regenerate/selection.py`) evaluates the 24 committed prose candidates and picks two per band by largest minimum margin, keeping a word split into several tokens. The picks are baker (short, 0.0099), village (short, 0.0018), buttons (medium, 0.0111), einstein (medium, 0.0035), stray-dog (long, 0.0045) and moon (long, 0.0034; "centimetres" is split into ` cent`/`imet`/`res`). I read the Continuations: some are odd (an oven that is "full", buttons put "in the fridge") but none is offensive. Short and long each had exactly two qualifiers; medium had three (the Great Wall Prompt lost on margin). Rounds 2–5 (licences, lists, the Declaration) are not committed, because the user's rule excludes them.
- **Trace shape.** `prompt_length` sits at the top level. Each position record carries `predictions: {tokens: [{token_id, token_text, token_bytes}], probabilities: <base64 little-endian float32>}`, top 10, most likely first. `TopTokens` is meant to be reused for the logit-lens top-5 (09). On the wire `PositionRecord` keeps its flat token fields; it does not nest a `Token`.
- **Core.** `build_trace(prompt, steps)` prefills the Prompt, then appends each Step's top-1 token ID while reusing the KV cache. Continuation text is never re-tokenized. The server (13) can call it directly, and it will need a token-ID entry point for its token-ID Step variant.
- **Web.** `?step=0..16` is in the query string. Step changes replace the history entry, so scrubbing doesn't flood Back. Changing the Example resets the Step to 0. `App.svelte` slices the Trace with `atStep`, so every view (and the strip) only ever sees the sequence at the current Step; 07–09 get this for free.
- `TokenSequence` is shared by Tokenize and Predict. Hovering, focusing (one tab stop, arrow keys) or tapping any token shows the top-3 predictions made at its Position, plus what actually comes next (rank and probability, or "not in the top 10"). The Tokenize details add the top prediction per Position for exact numbers without hover.
- Inside chips and tooltips, byte markers render `plain`, so buttons don't nest; the chip tooltip carries the partial-character explanation. The e2e test covers byte markers, ↵ and → by serving a modified copy of the default Example.
- **Live mode (14):**
  - `ViewFrame`'s "Step k of N" and `viewState`'s Step bound use `EXAMPLE_STEPS` (16); Live mode allows up to 64.
  - `StepControls` already takes its total from the Trace.
  - The Example titles are English content labels (`lang="en"`), not UI text.
- **Cross-platform floats: the risk came true in CI.** The first CI run on Linux x86_64 failed three tests. Regenerated float bits differed from the macOS-generated files. Near-tied top-10 tokens also ranked differently in two Examples, with neighbouring probabilities as close as 6e-7. As the user decided, the checks now keep tokens, IDs, headers and shapes exact and compare floats within the verification tolerances. Two top-10 tokens may swap ranks only when their probabilities are within 1e-4 of each other. In the Hugging Face check, a swapped token's probability is looked up in the reference's full distribution. Both `test_regenerating_reproduces_the_committed_files` and the Hugging Face top-10 check use one helper, `assert_same_trace` / `assert_same_top_tokens` in `python/tests/test_example_files.py`. The `.br` file must decompress exactly to the committed readable file. Later tickets adding attention (1/510) and embeddings (1e-6) extend `assert_same_trace` with their tolerances.
