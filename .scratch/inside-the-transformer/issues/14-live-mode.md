# 14: Live mode in the web app

**What to build:** The user opts in to Live mode, types their own Prompt, sees a real token preview and an "n / 64" counter while typing, and steps through the Continuation exactly as in Example mode, with every view working the same. Activating Live mode checks the server: checking, warming up (retry with backoff up to 60 s), ready, or unavailable with a clear message and one click back to Example mode. The Trace is held in the browser; editing the Prompt discards it. Non-English text gets a gentle warning. See spec: Web app (Live-mode states), Inference server.

**Blocked by:** 13

**Status:** ready-for-agent

- [x] A Live-mode toggle switches the data source; all views render a Live Trace the same way as an Example Trace
- [x] Typing calls tokenize, debounced at 300 ms, and shows the token preview and "n / 64" counter
- [x] Health is checked with a 3 s timeout; checking, warming up, ready and unavailable states are shown
- [x] Unavailable shows a clear message and one-click return to Example mode; Example mode never depends on the server
- [x] Steps call the step endpoint with the token IDs so far and `advance` 1; prev/next and the scrubber work on the browser-held Trace
- [x] Editing the Prompt discards the Continuation
- [x] Limit errors are shown as clear messages
- [x] Non-English text shows a warning that GPT-2 is mostly English
- [x] Playwright: "use Live mode" against the real backend
- [x] Playwright: "Live mode with server unavailable" with the frontend started without a backend

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **API path.** The web app calls the server under `/api` (`web/src/lib/live/api.ts`). The Vite dev and preview servers forward `/api/*` to `API_URL` with the prefix removed (default `http://127.0.0.1:8000`). Ticket 17's Caddy config must do the same (`handle_path /api/*`).
- **View state.** `mode` (`example` | `live`) joins the query string. In Live mode `step` may go up to 64, and is clamped to the Steps the browser holds. A reloaded Live-mode URL opens Live mode at Step 0 with an empty Prompt. Ticket 16 adds the Prompt in the fragment and restores the Step: `routeUrl` already keeps the fragment.
- **Session.** `web/src/lib/live/session.svelte.ts` holds the server state, the Prompt with its token preview, and the browser-held Trace.
  - Run sends the Prompt text with `advance` 0. Next sends the token IDs so far with `advance` 1, and the decoder appends the new Positions from `first_position` (`appendStep` in `decode.ts`).
  - Next asks the server only at the last Step held, and only while it is ready.
  - Editing the Prompt aborts any Step in flight and discards the Trace.
- **Server states.**
  - Health has a 3 s timeout. A 503 with `{status: "loading"}` means warming up, retried after 1, 2, 4 and then 8 s, with a last check at 60 s.
  - Anything else (a timeout, a network error, a proxy's 502) means unavailable. Unavailable shows "Back to Example mode" and "Try again".
  - A tokenize or Step answer of `model_loading` restarts the health check.
- **Limits.** The client disables Run when the token preview counts more than 64 tokens. The server's `prompt_too_long`, `continuation_too_long` and `empty_prompt` are worded from `code`. Ticket 15 adds 429: `#fail` in the session is where a `rate_limited` code would get its message.
- **Non-English warning.** `web/src/lib/live/language.ts` is a heuristic with no language detector. It flags text where more than 20% of the letters are outside A–Z, or, from 5 words on, text where fewer than 15% of the words are English function words. None of the six Example Prompts is flagged. Terse English with no function words (e.g. "Machine learning models transform data") is flagged; it is only a gentle warning.
- **Contract.**
  - `npm run gen:types` now also writes `web/src/lib/live/api.generated.ts`.
  - `npm run record:fixtures` starts the real server and records the Live-API fixtures in `web/tests/fixtures/live/`, the loading-state ones while the model loads. Vitest validates every fixture against `contract/api.schema.json`.
- **ADR 0001 amended (decided 2026-10-15).** An Example file is the same shape as a live API response: header plus position records, plus `first_position`. This settles the question left open in ticket 13.
- **Playwright** starts three servers: the real inference server on 8000 (up once Health reports ready), the built site on 4173, and a second copy on 4174 whose `/api` leads to no server. CI's web job now installs uv, the Python core and the cached model.
