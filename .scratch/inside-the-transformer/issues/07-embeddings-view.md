# 07: Embeddings view

**What to build:** The user sees each token's token embedding and position embedding as 768-dimension colored strips and sees that they are added before entering the first block. "Show details" shows the first 16 dimensions as exact values plus the vector norm, labelled as a truncated view. The Trace gains embeddings: int8 with a per-vector scale for the strips, plus the first 16 dimensions as float32. See spec: Trace, Web app.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Position records carry token and position embeddings as int8 with a per-vector scale, plus the first 16 dimensions as float32 and the norm
- [ ] The view draws each vector as a colored strip, keyed to the token's Position color
- [ ] The view shows the token and position embeddings being added
- [ ] Details show the first 16 dimensions and the norm, labelled as a truncated view
- [ ] The view is keyboard-usable, works on phone widths, and is added to the axe checks
- [ ] pytest: the first 16 dimensions match an independent Hugging Face run within 1e-6
- [ ] Each Example file stays under 300 KB brotli-compressed
