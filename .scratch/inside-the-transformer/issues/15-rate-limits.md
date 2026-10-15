# 15: Rate limits and concurrency cap

**What to build:** The server protects itself from overload: per-client limits of 120 tokenize calls per minute, 60 Step requests per minute and at most 2 requests in flight, all kept in memory only, plus a cap of 2 concurrent forward passes. Over the limit the server returns 429 with Retry-After, and the user sees a friendly message saying when they can continue. Behind the reverse proxy, the client IP is taken from the forwarded header only when the request comes from the proxy. See spec: Inference server.

**Blocked by:** 13, 14

**Status:** ready-for-agent

- [x] Per-IP limits: 120 tokenize/min, 60 Step requests/min, 2 in flight; counters live in memory only
- [x] A semaphore allows at most 2 concurrent forward passes; a multi-Step request holds one slot until finished
- [x] Over-limit requests return 429 with Retry-After
- [x] The client IP comes from the forwarded header only for requests from a trusted proxy address
- [x] The web app shows a friendly message with the wait time on 429
- [x] pytest: each limit triggers 429 with Retry-After, and a multi-Step request counts once
- [x] pytest: a forwarded header from an untrusted address is ignored

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Forward-pass cap.** The cap is the forward-pass thread pool of 2 (`FORWARD_PASS_THREADS` in `python/src/server/__init__.py`), which acts as the semaphore: a Step request holds one thread until all its Steps are done, and further requests wait for a free thread. There is no separate semaphore object.
- **Where the limits live.** `server.rate_limits.RateLimiter` holds a sliding one-minute log per client IP and kind of request, plus an in-flight count. `RateLimitMiddleware` admits each `/tokenize` and `/step` request before its body is read, and releases it when the request finishes. Retry-After is the seconds until the oldest counted request is a minute old, or 1 for too many in flight. Refused requests are not counted.
- **Ticket 17 (deployment).** Set `TRUSTED_PROXIES` on the API container to Caddy's address on the Compose network (IPs or CIDR ranges, comma-separated; default `127.0.0.1,::1`). The app reads `X-Forwarded-For` itself, through uvicorn's `ProxyHeadersMiddleware` inside `create_app`, and only from those addresses. uvicorn's own `proxy_headers` is off. Caddy's `reverse_proxy` sets `X-Forwarded-For` to the client IP by default.
- **Ticket 16 (shared Live links).** A 429 is `LiveApiError("rate_limited", retryAfter)`. `live.error === "rate_limited"` with `live.retryAfter` drives the message in `LivePanel`, so a rate-limited restore shows the same message if it goes through `LiveSession`.
