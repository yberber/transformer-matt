# 08: Attention view

**What to build:** The user sees a heatmap of which tokens attend to which, chooses any of the 12 layers and 12 heads, and reads exact weights in details. Keyboard users move between cells with arrow keys and hear "token A → token B: value" announced; `[` and `]` switch head quickly. On screens narrower than 640 px the heatmap becomes "choose a query token → ranked list of where it looks", with a small overview kept. An explanation covers why so much attention goes to the first token. Layer and head are in the URL. The Trace gains each Position's attention row for all 144 heads as uint8. See spec: Trace, Web app (attention heatmap), ADR 0003.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Position records carry that Position's attention row for every layer and head as uint8
- [ ] The heatmap is drawn with Canvas and labels rows and columns with token text and Position colors
- [ ] Native selects choose layer and head; `[` and `]` switch head
- [ ] The heatmap is one focusable grid with arrow-key navigation and a polite live region announcing the focused cell
- [ ] Below 640 px wide, a query-token chooser with a ranked bar list replaces the full heatmap, and a small overview remains
- [ ] The attention-sink explanation is shown
- [ ] Details show exact attention weights
- [ ] layer and head are in the query string
- [ ] The view is added to the axe checks
- [ ] pytest: attention matches an independent Hugging Face run within 1/510
- [ ] Each Example file stays under 300 KB brotli-compressed
- [ ] Playwright: "change head"
