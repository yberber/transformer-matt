# 16: Shared Live links

**What to build:** A user in Live mode can share a link that reopens their Prompt at the same Step. The Prompt travels in the URL fragment, which browsers never send to the server. Opening the link restores all Steps up to N in a single Step request with `advance` N, counted once against the rate limit, with a progress indicator. See spec: Web app, ADR 0002.

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] In Live mode the Prompt is written to the URL fragment, never the query string
- [ ] Opening a shared Live link sends one Step request with the Prompt text and `advance` N
- [ ] A progress indicator shows while the restore runs
- [ ] Server unavailable or rate limited while restoring shows the same messages as Live mode
- [ ] Playwright: "open shared Live URL" restores the Prompt and Step with exactly one Step request
