# 10: Architecture view and parameter counts

**What to build:** The user sees a diagram of the whole model with the 12 blocks drawn once with "×12" and can expand any block. Clicking any parameter tensor shows its shape, parameter count and share of total parameters. Every number comes from the official config through the Estimates module's parameter formulas, never typed by hand. The fused QKV matrix is shown as one 768×2304 matrix annotated as Q/K/V × 12 heads × 64, and the LM head is marked as tied to the token embedding and counted once. See spec: Web app (architecture view, Estimates module).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The Estimates module derives every parameter tensor's shape and count from the config
- [ ] Clickable tensors: token embedding, position embedding, and per block both LayerNorms, fused QKV, attention output projection, MLP up and down projections, plus the final LayerNorm; weights and biases listed separately
- [ ] Clicking a tensor shows shape, parameter count and share of total
- [ ] Fused QKV carries the Q/K/V × heads × 64 annotation; the LM head is marked as tied and counted once
- [ ] Blocks are drawn once with "×12", and any block can be expanded
- [ ] The view is keyboard-usable, works on phone widths, and is added to the axe checks
- [ ] Vitest: hand-computed reference values for each tensor, and a total of 124,439,808 parameters
