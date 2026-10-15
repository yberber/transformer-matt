# 11: Statistics: per-token and per-layer Estimates

**What to build:** The user sees estimated FLOPs per token split into prefill and decode, a breakdown by component (QKV and output projections, attention scores, MLP, embeddings, LM head), a per-layer view as one stacked bar with "×12" and a toggle to show all 12, and totals for the current text (prefill of the Prompt plus decode of each Step taken). Every figure is labelled as a theoretical Estimate. A static "How we calculate" page documents every formula and what is excluded. See spec: Web app (Estimates module, statistics).

**Blocked by:** 05, 10

**Status:** ready-for-agent

- [ ] The Estimates module computes FLOPs by the spec's counting rule: matrix multiplications only at 2 FLOPs per multiply-add; softmax, LayerNorm, GELU and residual adds excluded; embedding lookup as 0 FLOPs; LM head in full; attention following the causal mask exactly
- [ ] The Estimates module computes KV-cache bytes assuming float32
- [ ] The statistics view shows prefill and decode FLOPs per token, the component breakdown, and totals for the current Example and Step
- [ ] The per-layer view is one stacked bar with "×12" and a toggle to show all 12
- [ ] Embeddings appear as 0 FLOPs with an explanation; excluded operations are listed
- [ ] Every figure is labelled as a theoretical Estimate and links to "How we calculate"
- [ ] A static "How we calculate" page documents all formulas and exclusions in all three languages
- [ ] The views are added to the axe checks
- [ ] Vitest: hand-computed GPT-2 reference values for prefill and decode FLOPs, per component and KV-cache bytes
- [ ] Vitest: prefill cost equals the sum of decode costs at each prefix length
