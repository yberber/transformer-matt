# 19: KV-cache view

**What to build:** The user sees the KV cache for the current context: the size of each layer's K and V, growing as they step, with the total memory as a theoretical Estimate. See spec: Web app (Estimates module, "How we calculate").

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] The view shows per-layer K and V sizes and the total, from the shared Estimates module, assuming float32
- [ ] The figures grow as the user steps, in both Example and Live mode
- [ ] Every figure is labelled as a theoretical Estimate
- [ ] The view is keyboard-usable, works on phone widths, and is added to the axe checks
