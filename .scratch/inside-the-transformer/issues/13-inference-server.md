# 13: Inference server: tokenize, step, health

**What to build:** A FastAPI service over the Python core that serves Live mode. Tokenize returns tokens and the count for Prompt text. Step takes either Prompt text, or the token-ID sequence so far plus the Prompt length, together with `advance` k (0–64), and returns the position records for all new Positions. Health reports ready, or 503 while the model loads. Prompts over 64 tokens and runs over 64 Continuation tokens are rejected with explicit error codes. No request body or Prompt text is ever logged. See spec: Inference server, ADR 0001.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] FastAPI with uvicorn, one worker; forward passes run in a thread pool; torch thread count is set from the core count
- [ ] Tokenize returns tokens (ID, text, bytes) and the count
- [ ] Step accepts Prompt text or token IDs plus Prompt length, with `advance` 0–64; k=0 is prefill only; the KV cache is reused within one request
- [ ] Explicit error codes for a Prompt over 64 tokens and for more than 64 Continuation tokens
- [ ] Health returns 503 while the model loads and ready afterwards
- [ ] pytest: every response validates against the committed schema
- [ ] pytest: each Example Prompt sent with `advance` 16 matches its committed Example file within the same tolerances as the reference test
- [ ] pytest: a log-capture test fails if any Prompt text appears in any log record
- [ ] README explains how to run the server locally
