# 09: Transformer blocks view

**What to build:** The user steps through all 12 layers one at a time. For each layer the view shows its attention part (a summary linking to the attention heatmap for that layer) and its MLP part (how strongly the MLP changed each Position), plus a logit lens: the top-5 tokens the model would predict at the last Position if it stopped at this layer. The Trace gains per-layer MLP impact and logit-lens top-5. See spec: Trace, Web app (transformer-block view).

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Position records carry per-layer MLP impact (norm of the MLP output relative to the residual stream) and per-layer logit-lens top-5
- [ ] The view steps through layers 1–12 with keyboard-operable controls; the layer is in the query string
- [ ] Each layer shows an attention summary linking to the heatmap at that layer, MLP impact per Position, and the logit-lens top-5 at the last Position
- [ ] Details show exact MLP-impact values and logit-lens probabilities
- [ ] The view is added to the axe checks
- [ ] pytest: logit-lens tokens match an independent Hugging Face computation
- [ ] Each Example file stays under 300 KB brotli-compressed
- [ ] Playwright: "step through layers"
