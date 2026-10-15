# 12: Context-length chart

**What to build:** The user sees how compute cost grows with context length, from 1 to 1024 (n_positions) on a logarithmic x-axis, with a marker at the current length. The chart makes visible that the attention-score share grows with context. See spec: Web app (statistics).

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] The chart plots Estimates from 1 to 1024 on a log x-axis using the shared Estimates module
- [ ] A marker shows the current context length and moves as the user steps
- [ ] The attention-score share is distinguishable from the rest
- [ ] The chart has a text alternative, is labelled as a theoretical Estimate, and is added to the axe checks
- [ ] The chart works on phone widths
