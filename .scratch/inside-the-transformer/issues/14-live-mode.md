# 14: Live mode in the web app

**What to build:** The user opts in to Live mode, types their own Prompt, sees a real token preview and an "n / 64" counter while typing, and steps through the Continuation exactly as in Example mode, with every view working the same. Activating Live mode checks the server: checking, warming up (retry with backoff up to 60 s), ready, or unavailable with a clear message and one click back to Example mode. The Trace is held in the browser; editing the Prompt discards it. Non-English text gets a gentle warning. See spec: Web app (Live-mode states), Inference server.

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] A Live-mode toggle switches the data source; all views render a Live Trace the same way as an Example Trace
- [ ] Typing calls tokenize, debounced at 300 ms, and shows the token preview and "n / 64" counter
- [ ] Health is checked with a 3 s timeout; checking, warming up, ready and unavailable states are shown
- [ ] Unavailable shows a clear message and one-click return to Example mode; Example mode never depends on the server
- [ ] Steps call the step endpoint with the token IDs so far and `advance` 1; prev/next and the scrubber work on the browser-held Trace
- [ ] Editing the Prompt discards the Continuation
- [ ] Limit errors are shown as clear messages
- [ ] Non-English text shows a warning that GPT-2 is mostly English
- [ ] Playwright: "use Live mode" against the real backend
- [ ] Playwright: "Live mode with server unavailable" with the frontend started without a backend
