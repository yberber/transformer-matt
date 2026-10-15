# 13: Inference server: tokenize, step, health

**What to build:** A FastAPI service over the Python core that serves Live mode. Tokenize returns tokens and the count for Prompt text. Step takes either Prompt text, or the token-ID sequence so far plus the Prompt length, together with `advance` k (0–64), and returns the position records for all new Positions. Health reports ready, or 503 while the model loads. Prompts over 64 tokens and runs over 64 Continuation tokens are rejected with explicit error codes. No request body or Prompt text is ever logged. See spec: Inference server, ADR 0001.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] FastAPI with uvicorn, one worker; forward passes run in a thread pool; torch thread count is set from the core count
- [x] Tokenize returns tokens (ID, text, bytes) and the count
- [x] Step accepts Prompt text or token IDs plus Prompt length, with `advance` 0–64; k=0 is prefill only; the KV cache is reused within one request
- [x] Explicit error codes for a Prompt over 64 tokens and for more than 64 Continuation tokens
- [x] Health returns 503 while the model loads and ready afterwards
- [x] pytest: every response validates against the committed schema
- [x] pytest: each Example Prompt sent with `advance` 16 matches its committed Example file within the same tolerances as the reference test
- [x] pytest: a log-capture test fails if any Prompt text appears in any log record
- [x] README explains how to run the server locally

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Endpoints** (`python/src/server/__init__.py`, run with `uv run serve`; `HOST` and `PORT` default to 127.0.0.1:8000):
  - `POST /tokenize {prompt}` → `{tokens: [{token_id, token_text, token_bytes}], count}`. Prompts over 64 tokens are still counted, so the web app can show "70 / 64".
  - `POST /step {prompt, advance}` or `{token_ids, prompt_length, advance}` → `{header, prompt_length, first_position, positions}`.
  - `GET /health` → 503 `{status: "loading"}`, then 200 `{status: "ready"}`.
- **Step response and ADR 0001: needs a decision.** ADR 0001 says an Example file is "byte-for-byte the same shape as a live API response". The Step response adds one field, `first_position`. The token-ID variant returns only the new Positions, and a slice cannot otherwise say where it starts: the Trace's own check counts attention rows from Position 0. With Prompt text, `first_position` is 0, and the response minus that field is exactly an Example file's Trace. The test compares it to the committed files that way. Position records are identical in both, so the web app's decoder can share everything below the top level. Either amend ADR 0001 to say "header plus position records, plus `first_position`", or choose another way to mark the slice. I left the ADR unchanged.
- **Contract.** The request and response models live in `python/src/inside_transformer/api.py`. `uv run export-schema` now writes `contract/api.schema.json` (all models under `$defs`, by class name) next to `trace.schema.json`, and pytest checks both for drift. TypeScript types for the API are **not** generated yet. Ticket 14 should generate them, and should validate its Live-API fixtures against the schema in Vitest (spec seam 3).
- **Error codes** (`{code, message}`):
  - 422 `prompt_too_long`, `continuation_too_long`, `empty_prompt` and `invalid_request`.
  - 503 `model_loading`, from tokenize or Step before the model is ready.
  - 404 `not_found` and 405 `method_not_allowed`.
  - The web app should word its message from `code`; `message` is for developers.
  - `advance` over 64, or token IDs whose Continuation would exceed 64 tokens, give `continuation_too_long`. The schema states `maximum: 64` on `advance`.
- **Beyond the ticket's text:**
  - Text over 64 × 128 characters (GPT-2's longest token is 128 bytes) is rejected as `prompt_too_long` before tokenizing, on tokenize too. That much text is provably over the limit, and the check keeps huge pastes off the tokenizer.
  - Validation errors never echo the request's `input`.
- **Core.**
  - `advance(token_ids, steps, record_from)` is the new token-ID entry point; `build_trace` calls it. The prefill computes logits only for recorded Positions (`logits_to_keep`), so a token-ID Step doesn't run the LM head over the whole sequence. Regeneration is still byte-identical on this machine.
  - **Concurrency fix (found in review).** The layer-recording hooks used to be attached and removed for each call on the one shared model. Two concurrent passes then wrote into each other's recordings. They are now installed once, and record into a thread-local recording. `test_concurrent_steps_each_match_their_example_file` covers it.
- **Threads.** Forward passes run in a 2-thread pool, and torch gets `cores // 2` threads (via `sched_getaffinity` where available, which respects container CPU limits). A request holds its thread for all its Steps and reuses the KV cache. Ticket 15 adds the semaphore and 429s on top; the pool already caps parallel passes at 2.
- **Privacy.**
  - uvicorn's access log is off, because it records query strings. Caddy keeps the access log (ticket 17).
  - The log-capture test runs a real uvicorn server with the production config, switches every log level on, and searches all log records plus stdout and stderr for the Prompt's words. I checked it by turning the access log on, and separately by adding a `logger.debug` of the Prompt: it failed both times.

**Follow-up (2026-10-15).** The `first_position` question is decided: ADR 0001 now reads "header plus position records, plus `first_position`" (see ticket 14).
