# Inside the Transformer — v1

Status: ready-for-agent

## Problem Statement

People who are curious about language models have no way to look inside one. Explanations online are either hand-wavy analogies with no real numbers, or research tooling that assumes ML expertise, a Python environment and a GPU. A curious non-expert cannot watch a real model turn a piece of text into its Continuation, see how the text is split into tokens, see what attention actually looks at, or see the probabilities behind each next token. Students and developers who want accurate numbers (shapes, parameter counts, compute cost) have to piece them together from papers and config files, and rarely see them tied to a concrete run.

## Solution

"Inside the Transformer" is a static website that opens up GPT-2 small (124M parameters) and lets the user step through it with real numbers. It explains up front that GPT-2 is a text-completion model, not a chat assistant, so every Prompt is text to continue.

By default the site runs in Example mode: six built-in Examples (two short, two medium, two long, all English), each shipped with a precomputed Trace of real GPT-2 values and 16 precomputed Steps. Nothing is downloaded beyond small data files and no server is called. The user moves through a guided pipeline (Tokenize → Embed → Blocks ×12 → Predict) and can step the Continuation forward and back one token at a time, with greedy decoding only.

Optionally the user switches to Live mode, types their own Prompt (up to 64 tokens), and a small CPU inference server runs GPT-2 for them, up to 64 Steps. Live mode looks and behaves exactly like Example mode because both consume the same Trace format. If the server is down, the user gets a clear message and Example mode keeps working. User text is never stored or logged.

Alongside the pipeline, an architecture view shows the whole model with shapes and parameter counts taken from the official config, and statistics views show theoretical Estimates of compute cost (FLOPs for prefill and decode, per component and layer, growth with context length, KV-cache memory). Every view state is shareable as a URL, the UI is available in English, Turkish and German, works on desktop and mobile, is fully keyboard-usable, meets WCAG AA contrast and has light and dark themes.

## User Stories

### Orientation

1. As a curious non-expert, I want the landing view to tell me in one sentence what I am looking at, so that I know what the site is for before I click anything.
2. As a curious non-expert, I want a clear note that GPT-2 continues text rather than answering questions, so that I am not confused when it does not "reply" to me.
3. As a curious non-expert, I want an Example to be loaded by default, so that I see the machine working without having to type anything.
4. As a curious non-expert, I want to choose between six Examples labelled short, medium and long, so that I can start small and move to richer texts.
5. As a Turkish- or German-speaking user, I want a note explaining why the Examples are in English, so that I understand GPT-2 was trained mostly on English text.
6. As a user, I want a persistent pipeline strip (Tokenize → Embed → Blocks ×12 → Predict), so that I always know where in the model I am.
7. As a user, I want every view to open with a one-sentence plain-language explanation, so that I get the main idea before any numbers.
8. As a user, I want exact numbers hidden behind a "Show details" control in each view, so that the default view stays simple.
9. As a student or developer, I want "Show details" to reveal exact values, shapes and token IDs, so that I can check the numbers myself.

### Tokenization

10. As a user, I want to see the Prompt split into tokens, so that I understand the model does not read words or letters directly.
11. As a user, I want each token's ID shown in details, so that I see that tokens are numbers to the model.
12. As a user, I want a leading space shown as a faint dot before the token, so that I can see that spaces are part of tokens.
13. As a user, I want newlines and tabs shown as visible markers, so that invisible characters do not disappear.
14. As a user typing non-English text in Live mode, I want tokens that are only part of a character shown as byte markers with a tooltip, so that I understand why a letter can be split across tokens.
15. As a user, I want each token's raw bytes visible in details, so that I can see exactly what the token contains.
16. As a user, I want at least one Example that contains a word split into several tokens, so that tokenization shows something surprising.

### Token identity and color

17. As a user, I want each token to keep the same color in every view, so that I can follow one token through the whole model.
18. As a user, I want color to belong to the token's Position, so that two occurrences of the same word are recognisably different tokens.
19. As a colour-blind user, I want token text or Position number shown alongside color everywhere, so that color is never the only way to identify a token.

### Embeddings

20. As a user, I want to see each token's token embedding and position embedding as vectors, so that I understand how a token becomes numbers.
21. As a user, I want each 768-dimension vector drawn as a colored strip, so that I can compare vectors at a glance.
22. As a student, I want details to show the first 16 dimensions as exact values plus the vector norm, labelled as a truncated view, so that I can see real numbers without a wall of digits.
23. As a user, I want to see that the token and position embeddings are added together before entering the first block, so that I understand what the blocks receive.

### Transformer blocks

24. As a user, I want to step through all 12 layers one at a time, so that I can watch the computation progress.
25. As a user, I want each block to show its attention part and its MLP part, so that I learn the two halves of a block.
26. As a user, I want to see how strongly the MLP changed each Position in this layer, so that I can see where a layer "did work".
27. As a user, I want a logit lens per layer showing the top-5 tokens the model would predict at the last Position if it stopped here, so that I can watch the guess form layer by layer.
28. As a user, I want the attention summary in a block to link to the full attention heatmap for that layer, so that I can dig deeper.

### Attention

29. As a user, I want a heatmap of which tokens attend to which, so that I can see what each token looks at.
30. As a user, I want layer and head selectors, so that I can explore all 144 heads.
31. As a keyboard user, I want `[` and `]` shortcuts and native selectors for layer and head, so that I can switch quickly without a mouse.
32. As a keyboard user, I want to move between heatmap cells with arrow keys and hear "token A → token B: value" announced, so that the heatmap is usable without sight or mouse.
33. As a mobile user, I want the heatmap to become "choose a query token → ranked list of where it looks" on narrow screens, with a small overview kept, so that attention is readable on a phone.
34. As a user, I want an explanation of why so much attention goes to the first token, so that the attention-sink pattern does not look like a bug.
35. As a student, I want exact attention weights in details, so that I can read individual values.

### Next-token prediction and Steps

36. As a user, I want to see the top-10 next-token probabilities, so that I understand the model chooses from a ranked list.
37. As a user, I want the top-1 token appended when I ask for the next token, so that I watch greedy generation happen one Step at a time.
38. As a user, I want every view to update to the new Step's sequence, so that tokenization, embeddings, blocks and attention reflect the extended text.
39. As a user, I want prev/next Step controls and a scrubber, so that I can go back and compare earlier Steps.
40. As a user in Example mode, I want a clear message when the 16 precomputed Steps are used up, so that I know why the next-token button is disabled.
41. As a user, I want to hover a Prompt token and see what the model predicted at that Position, so that I can see where the text surprised the model.
42. As a user, I want it made clear that decoding is greedy (always the top token), so that I understand why results are deterministic.

### Architecture view

43. As a user, I want a diagram of the whole model, so that I see how the pieces fit together.
44. As a user, I want the 12 blocks drawn once with "×12" and the option to expand any one, so that the diagram stays readable.
45. As a student, I want to click any weight matrix or bias and see its shape, parameter count and share of total parameters, so that I understand where the 124M parameters live.
46. As a student, I want the fused QKV matrix shown as one matrix with labels splitting it into Q, K and V and 12 heads of 64, so that I understand how heads are laid out.
47. As a student, I want the LM head marked as shared with the token embedding and counted once, so that the totals add up correctly.
48. As a developer, I want every number in the architecture view derived from the official GPT-2 config, so that I can trust none were typed in by hand.

### Statistics (Estimates)

49. As a user, I want the estimated FLOPs per token split into prefill and decode, so that I see that reading the Prompt and generating cost differently.
50. As a student, I want a breakdown by component (QKV and output projections, attention scores, MLP, embeddings, LM head), so that I see where compute goes.
51. As a student, I want the per-layer view shown as one stacked bar with "×12" and a toggle to show all 12 layers, so that I see the layers are identical in cost.
52. As a student, I want embeddings shown as 0 FLOPs with an explanation, so that I understand a lookup is not a computation.
53. As a student, I want a chart of cost against context length from 1 to 1024 on a log axis with a marker at the current length, so that I see how attention cost grows.
54. As a user, I want totals for the current text based on the Prompt length and the Steps taken so far, so that the numbers relate to what I am looking at.
55. As a student, I want the KV-cache memory for the current context, and a view of each layer's K and V growing as I step, so that I understand what decode stores.
56. As a user, I want every Estimate labelled as a theoretical Estimate, so that I do not mistake it for a measurement.
57. As a student, I want a "How we calculate" page documenting every formula and what is excluded (softmax, LayerNorm, GELU, residual adds), so that I can reproduce the numbers.
58. As a student, I want a context-length slider on that page driving the same formulas the statistics views use, so that I can explore them interactively.

### Live mode

59. As a user, I want to opt in to Live mode and type my own Prompt, so that I can explore text I care about.
60. As a user, I want a real token preview and a "n / 64" counter while typing, so that I know when I am near the limit.
61. As a user, I want a clear message if my Prompt exceeds 64 tokens or my run exceeds 64 Steps, so that I know why it was rejected.
62. As a user, I want Live mode to look and behave exactly like Example mode, so that I do not have to learn a second interface.
63. As a user, I want a visible state while the server is checked, warming up or ready, so that I know what is happening.
64. As a user, I want a clear "server unavailable" message with one click back to Example mode, so that I am never stuck.
65. As a user, I want editing my Prompt to discard the current Continuation, so that what I see always matches my text.
66. As a user who is rate limited, I want a friendly message saying when I can continue, so that I am not left guessing.
67. As a privacy-conscious user, I want my text never stored or logged, so that I can type freely.
68. As a user typing non-English text, I want a gentle warning that GPT-2 is mostly English, so that odd Continuations are explained.

### Sharing and URLs

69. As a user, I want every view state (Example, view, layer, head, Step, language) in the URL, so that I can share exactly what I see.
70. As a recipient of a shared URL, I want it to open the same view state, so that I see what the sender saw.
71. As a user sharing a Live-mode link, I want my Prompt to travel in the URL fragment, so that it never reaches server logs.
72. As a recipient of a shared Live link, I want all Steps up to the shared one restored in a single request with a progress indicator, so that restoring does not hit the rate limit.
73. As a user on plain HTTP, I want the copy-link control to fall back to a pre-selected text field, so that sharing works without HTTPS clipboard access.

### Languages, themes, accessibility

74. As a Turkish, German or English speaker, I want the UI in my browser language by default with English as fallback, so that I can read it comfortably.
75. As a user, I want to switch language at any time, so that I can choose a different one than my browser.
76. As a user, I want technical terms (token, attention, embedding, layer) kept in English with a short explanation in my language, so that I learn the real vocabulary.
77. As a user, I want light and dark themes following my system setting, with a toggle, so that the site is comfortable to read.
78. As a low-vision user, I want text contrast to meet WCAG AA in both themes, so that I can read everything.
79. As a keyboard-only user, I want every control reachable and operable by keyboard with visible focus, so that I can use the whole site.
80. As a user with reduced-motion enabled, I want animations replaced by instant transitions, so that the site does not make me uncomfortable.
81. As a user, I want animations to show data moving between stages, so that motion explains rather than decorates.
82. As a mobile user, I want every view usable on a phone, so that I can explore anywhere.
83. As a user, I want the site to load quickly, so that I am not waiting before I can explore.

### Maintainers and operators

84. As a maintainer, I want one script that regenerates all Example data from the pinned reference model, so that data can be rebuilt reproducibly.
85. As a maintainer, I want regeneration to produce byte-identical files, so that drift is detectable.
86. As a maintainer, I want the six Examples chosen by explicit, checked rules, so that their selection is reproducible and justified.
87. As a maintainer, I want the API contract committed and checked on both sides, so that frontend and backend cannot drift apart silently.
88. As an operator, I want to deploy frontend and backend to one VM with Docker Compose, so that hosting is simple.
89. As an operator, I want the first deploy to work on the VM's IP over HTTP and switch to a domain with automatic TLS by setting one variable, so that I can add a domain later without code changes.
90. As an operator, I want per-client rate limits and a cap on concurrent forward passes, so that five concurrent users cannot overload a CPU-only server.
91. As a maintainer, I want a README explaining how to run, test, deploy and regenerate Example data, so that anyone can work on the project.

## Implementation Decisions

### Model and decoding

- Exactly one model: GPT-2 small from Hugging Face at a pinned model revision; torch and transformers are pinned to exact versions. All inference is float32 on CPU.
- Greedy decoding only. No `<|endoftext|>` token is prepended to the Prompt, matching the default Hugging Face run (ADR 0003).
- All architecture numbers come from the official config of the pinned revision. The regeneration script copies that config into the web app's data so Example mode needs no server; parameter counts and Estimates are derived from it by formula.

### Examples

- Six English Examples: two short (8–12 Prompt tokens), two medium (22–28), two long (44–48). Each ships with exactly 16 precomputed Steps, so no Example exceeds 64 Positions and every Example Prompt is also a valid Live-mode Prompt.
- The agent selects the six itself from roughly 15 drafted candidates. A candidate qualifies only if: its Prompt length falls in its band; no token 3-gram repeats within its 16 Continuation tokens; at every Step the top-1 probability exceeds the top-2 by at least 0.001; the Continuation contains no newline-only tokens and nothing offensive; and the Prompt reads as text to continue, not a question. Candidates are natural prose (short stories, everyday facts), never licence or legal texts and never counting or list sequences. Among qualifying candidates, prefer the largest minimum margin, and ensure at least one Example contains a word split into several tokens. (Changed 2026-10-15: the margin was 0.05, which only memorized boilerplate such as software licences passed; 0.001 still keeps each greedy choice clear of float differences between machines.)
- Example files are committed to the repo in both brotli-compressed and readable form. Building and deploying the site needs no Python or model.

### Trace (shared format)

- One Python core package tokenizes, runs GPT-2 and builds Traces; both the regeneration script and the inference server call it. The Trace is both the Example file format and the Live API response (ADR 0001).
- A Trace is a header plus an ordered list of position records. The header carries the model ID, pinned revision and the config values used. Each position record carries: token ID, token text and raw bytes; token and position embeddings; that Position's attention row for every one of the 144 heads; per-layer MLP impact (norm of the MLP output relative to the residual stream); per-layer logit-lens top-5; and the top-10 next-token predictions from that Position.
- Because attention is causal, a Position's attention row never changes once later tokens arrive, so the final Step's data contains every earlier Step.
- Encoding: JSON for structure, base64 for typed arrays. Attention is uint8 (lower triangle); embeddings are int8 with a per-vector scale for the 768-dim strips, plus the first 16 dimensions as exact float32; probabilities and norms are float32 (the 1e-4 tolerance rules out float16 for probabilities). One decoder in the web app handles Example files and API responses alike.
- Size budget: each Example's single file must be under 300 KB brotli-compressed; if a file is over budget, precision is reduced before content is dropped. Initial page load must stay under 2 MB.

### Contract

- Pydantic models in the core are the single source of truth. They export an OpenAPI/JSON Schema that is committed; TypeScript types are generated from it. CI fails if the exported schema differs from the committed one.

### Inference server

- FastAPI with uvicorn, one worker process. Forward passes run in a thread pool behind a semaphore allowing 2 concurrent passes; torch thread count is set from the VM's core count. Python dependencies are managed with uv.
- Endpoints:
  - Tokenize: takes Prompt text, returns tokens (ID, text, bytes) and the count. Called debounced (300 ms) while the user types; the browser never loads a tokenizer.
  - Step: takes either Prompt text, or the token-ID sequence so far plus the Prompt length, together with `advance` k (0–64). Returns the position records for all new Positions. k=0 is prefill only; normal use is k=1; restoring a shared Live link sends the Prompt text with `advance` N in one request. Continuation text is never re-tokenized. A request holds one forward-pass slot until finished and reuses the KV cache within the request. Requests exceeding 64 Prompt tokens or 64 Continuation tokens are rejected with explicit error codes.
  - Health: reports ready, or 503 while the model loads.
- Rate limits per client IP, kept in memory only: 120 tokenize calls/min, 60 Step requests/min (a multi-Step restore counts once), at most 2 requests in flight. Over the limit returns 429 with Retry-After.
- Privacy: the server never logs request bodies or Prompt text; nothing is persisted.

### Web app

- Static single-page app in TypeScript: Svelte 5 with Vite, npm, Node version pinned. Hand-written SVG for diagrams, Canvas for large heatmaps, d3 modules only for scales and the cost chart.
- Page structure: guided flow with a persistent pipeline strip (Tokenize → Embed → Blocks ×12 → Predict); architecture and statistics are separate pages linked from the flow; each view leads with its one-sentence explanation and "Show details" beneath.
- View state (example, view, layer, head, step, lang) lives in the query string. Live-mode Prompt text lives in the URL fragment (ADR 0002).
- Live-mode states on activation: checking (health call with 3 s timeout), warming up (503, retry with backoff up to 60 s), ready, unavailable (message plus one-click return to Example mode). Example mode never depends on the server. In Live mode the Trace is held in the browser; editing the Prompt discards it.
- Step navigation: prev/next controls and a scrubber in both modes. In Example mode the next control is disabled after Step 16 with an explanation.
- Token color belongs to Position, from a validated 10-hue palette assigned in order and cycling; token text or Position number always accompanies color.
- Token rendering: leading space as a faint dot, newline as ↵, tab as →, incomplete UTF-8 byte tokens as a byte marker with a tooltip; details always show raw bytes and token ID.
- Transformer-block view per layer: attention summary linking to the heatmap, MLP impact per Position, logit-lens top-5 at the last Position.
- Attention heatmap: single focusable grid with arrow-key navigation and a polite live region; native selects for layer and head with `[`/`]` shortcuts; below 640 px wide it becomes a query-token chooser with a ranked bar list plus a small overview.
- Architecture view: every parameter tensor is clickable (token and position embeddings, and per block the two LayerNorms, fused QKV, attention output projection, MLP up and down projections, plus the final LayerNorm), weights and biases separately. Fused QKV is shown as one 768×2304 matrix annotated as Q/K/V × 12 heads × 64. LM head is marked as tied to the token embedding and counted once. Blocks drawn once with ×12, any one expandable.
- Estimates module (TypeScript, pure functions over the config, Prompt length and Step count), shared by statistics views and the "How we calculate" page. Counting rule: matrix multiplications only, 2 FLOPs per multiply-add; softmax, LayerNorm, GELU and residual adds excluded and listed as excluded; embedding lookup counts 0 FLOPs but appears in the breakdown; LM head counted in full (768 × 50257); attention scores and weighted sum follow the causal mask exactly, so prefill cost equals the sum of decode costs at each prefix length. KV-cache size assumes float32. Totals are prefill of the Prompt plus decode of each Step taken.
- Statistics: per-layer view is one stacked bar with ×12 and a toggle to show all 12; context-length chart from 1 to 1024 (n_positions) on a log x-axis with a marker at the current length.
- "How we calculate": a static formulas-only version ships early (labelling Estimates is a Must); the interactive context-length slider and the KV-cache view are built last.
- i18n: English source; Turkish and German drafted by the agent and reviewed by a native speaker before release. Default follows browser language, fallback English; technical terms stay English with a short localized explanation; the GPT-2-is-English note appears in all languages.
- Visual direction "specimen under glass": light theme warm off-white paper with ink-blue lines; dark theme dark lab bench with phosphor-like token colors; serif for explanations, monospace for numbers and tokens; the pipeline strip drawn as one physical apparatus tokens flow through; motion only for data moving between stages, instant cuts under reduced motion. A throwaway prototype of the pipeline strip plus one view validates the direction before views are built.
- Theme follows the system setting with a manual toggle; contrast meets WCAG AA in both themes.

### Deployment

- One Oracle Cloud VM (Ampere A1 ARM assumed), Docker Compose with two services: Caddy and the API container.
- Caddy serves the static build (with precompressed brotli/gzip), proxies the API path, compresses API responses with zstd/gzip, and keeps access logs to method, path without query, status and timing.
- The site address is one variable defaulting to plain HTTP on the VM's IP; setting it to a domain turns on automatic TLS.
- The API image is built for arm64 with the model weights at the pinned revision baked in.
- Docker is needed only on the VM; local development uses uv and npm.

### Repo and CI

- One repo with: the web app, the Python core package, the server, the regeneration script, the committed contract schema, and the generated Example files inside the web app's static data.
- CI on GitHub Actions (a GitHub remote is to be added), with the Hugging Face model cached.
- README covers run, test, deploy and regenerate.

## Testing Decisions

- Good tests exercise external behaviour through the highest available seam and assert on observable outputs (files, HTTP responses, rendered pages, function results), never on internal structure. Svelte components, URL-state parsing, the Trace decoder and i18n lookups are not tested as separate units; they are covered through the browser and the contract.
- The codebase is greenfield, so there is no prior art; these five seams establish it.

1. **Committed Example files** (pytest):
   - An independent Hugging Face run (plain `model(...)` plus a greedy argmax loop, not using the core) must match each file: identical tokens, probabilities within 1e-4, attention within 1/510, first 16 embedding dimensions within 1e-6.
   - Regenerating produces byte-identical files.
   - Each file is under 300 KB brotli-compressed.
   - Each Example satisfies the selection rules (length band, no repeated 3-gram, minimum margin 0.001).
2. **HTTP API** (pytest against the FastAPI app with the real model):
   - Tokenize, Step (text and token-ID variants, k=0, k=1, multi-Step restore) and Health behave as specified, including limit error codes.
   - Rate limits return 429 with Retry-After; a multi-Step restore counts once.
   - Model-loading state returns 503.
   - Each Example Prompt sent with `advance` 16 matches its committed Example file within the same tolerances.
   - A log-capture test fails if any Prompt text appears in any log record.
3. **Committed contract schema**:
   - API tests validate every response against it.
   - Vitest validates every Example file and every Live-API fixture against it.
   - CI fails if the schema exported from the Pydantic models differs from the committed one.
4. **Estimates module** (Vitest):
   - FLOPs (prefill and decode), component and layer breakdown, KV-cache bytes and parameter counts checked against hand-computed GPT-2 reference values (e.g. 124,439,808 total parameters with tied embeddings).
   - Invariant: prefill cost equals the sum of decode costs at each prefix length.
   - A check that every translation key exists in all three languages also lives in Vitest.
5. **Built site in a browser** (Playwright against the real backend):
   - E2E scenarios: open an Example, step through layers, change head, generate next token, switch language, open a shared URL, use Live mode, Live mode with server unavailable (frontend started without backend).
   - axe checks on the main views report no violations.
   - Lighthouse CI: performance at least 90 and initial load under 2 MB in Example mode.

## Out of Scope

- Training or fine-tuning.
- Any decoding other than greedy (no sampling, temperature, top-k/top-p, beam search), and choosing a non-top-1 token.
- Any model other than GPT-2 small, including closed models whose architecture is not public.
- User accounts, saved Prompts or any server-side persistence of user input.
- A browser-side tokenizer or in-browser model.
- A domain name and TLS for the first deploy (supported by one variable, not configured).
- Non-English Examples.

## Further Notes

- Priorities from the product spec: **Must** — Example mode with all six explore views, architecture view, per-token and per-layer statistics, three languages, tests (including the static "How we calculate" formulas page, since labelling Estimates is a Must). **Should** — Live mode, shareable URLs, context-length chart. **Could** — KV-cache view and the interactive "How we calculate" page; these are built last.
- ADRs in force: 0001 (one Python core, Trace is the contract), 0002 (Live Prompt in the URL fragment), 0003 (no `<|endoftext|>` prefix).
- Domain vocabulary follows the root glossary: Prompt, Continuation, Step, Position, Trace, Example, Example mode, Live mode, Estimate.
- Turkish and German translations need native-speaker review before release.
- A full 128-Position restore response is about 1.6 MB of JSON before compression; Caddy compression keeps transfer reasonable.
