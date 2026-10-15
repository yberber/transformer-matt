# 16: Shared Live links

**What to build:** A user in Live mode can share a link that reopens their Prompt at the same Step. The Prompt travels in the URL fragment, which browsers never send to the server. Opening the link restores all Steps up to N in a single Step request with `advance` N, counted once against the rate limit, with a progress indicator. See spec: Web app, ADR 0002.

**Blocked by:** 14

**Status:** ready-for-agent

- [x] In Live mode the Prompt is written to the URL fragment, never the query string
- [x] Opening a shared Live link sends one Step request with the Prompt text and `advance` N
- [x] A progress indicator shows while the restore runs
- [x] Server unavailable or rate limited while restoring shows the same messages as Live mode
- [x] Playwright: "open shared Live URL" restores the Prompt and Step with exactly one Step request

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Where the Prompt lives.** `ViewState.prompt` is read from `#prompt=…` and written only by `viewStateFragment`, and only in Live mode; `viewStateQuery` leaves it out. In-app links built with `routeUrl` keep the fragment, so Copy link shares it. The App writes the Live session's Prompt to the URL with `replaceState` as the user types.
- **Restoring.** `live.restore(prompt, step)` sets `live.sharedStep`; once the server is ready, `run()` sends the Prompt text with `advance` = that Step and clears it on success. While it is set, the App does not clamp `step` to the Steps held. Rate limited, unavailable and model loading show Live mode's own messages. After a rate limit, Run restores the shared Step; after "Try again" or a warm-up, the restore resumes by itself. A refused request while the model loads means a second Step request once it is ready. Editing the Prompt or leaving Live mode drops a pending restore.
- **Back, Forward and fragment-only links.** `onHistoryMove` (route) calls listeners in the same `popstate` task, before effects run (browsers run microtasks between event listeners, so a second `popstate` listener would see the fragment-sync effect's write-back). The App restores when the URL asks for a Prompt or Step the browser does not hold.
