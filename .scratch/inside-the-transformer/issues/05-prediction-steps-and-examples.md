# 05: Next-token prediction, Steps and the six Examples

**What to build:** The user picks one of six Examples (two short, two medium, two long), sees the top-10 next-token probabilities, and asks for the next token: the top-1 token is appended greedily and every view shows the extended sequence. The user can go back and forth with prev/next controls and a scrubber; the Step is in the URL. After 16 Steps the next control is disabled with an explanation. Hovering a Prompt token shows what the model predicted at that Position. The Trace gains per-Position top-10 predictions, and Examples are precomputed with 16 Steps. The agent drafts about 15 candidate Prompts and selects the six by the spec's rules. See spec: Examples, Trace, Web app (Step navigation).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The Trace's position records carry the top-10 next-token predictions (token and float32 probability)
- [ ] The core can advance a Prompt by k greedy Steps, appending the top-1 token each time; Continuation text is never re-tokenized
- [ ] Six English Examples are committed, two each in the bands short 8–12, medium 22–28, long 44–48 Prompt tokens, each with exactly 16 Steps
- [ ] Each Example satisfies the selection rules: no repeated token 3-gram in its 16 Continuation tokens; top-1 exceeds top-2 by at least 0.05 at every Step; no newline-only tokens and nothing offensive in the Continuation; the Prompt is text to continue, not a question
- [ ] Among qualifying candidates the largest minimum margin is preferred, and at least one Example contains a word split into several tokens
- [ ] An Example picker shows the six Examples labelled short, medium and long
- [ ] The prediction view shows the top-10 probabilities and states that decoding is greedy
- [ ] Prev/next controls and a scrubber move between Steps in every view; the Step is in the query string
- [ ] The next control is disabled after Step 16 with an explanation
- [ ] Hovering a Prompt token shows the prediction made at that Position
- [ ] pytest: an independent Hugging Face greedy run matches each Example's tokens exactly and probabilities within 1e-4
- [ ] pytest: each Example satisfies the selection rules
- [ ] Each Example file stays under 300 KB brotli-compressed
- [ ] Playwright: "generate next token"
