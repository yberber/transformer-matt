# 15: Rate limits and concurrency cap

**What to build:** The server protects itself from overload: per-client limits of 120 tokenize calls per minute, 60 Step requests per minute and at most 2 requests in flight, all kept in memory only, plus a cap of 2 concurrent forward passes. Over the limit the server returns 429 with Retry-After, and the user sees a friendly message saying when they can continue. Behind the reverse proxy, the client IP is taken from the forwarded header only when the request comes from the proxy. See spec: Inference server.

**Blocked by:** 13, 14

**Status:** ready-for-agent

- [ ] Per-IP limits: 120 tokenize/min, 60 Step requests/min, 2 in flight; counters live in memory only
- [ ] A semaphore allows at most 2 concurrent forward passes; a multi-Step request holds one slot until finished
- [ ] Over-limit requests return 429 with Retry-After
- [ ] The client IP comes from the forwarded header only for requests from a trusted proxy address
- [ ] The web app shows a friendly message with the wait time on 429
- [ ] pytest: each limit triggers 429 with Retry-After, and a multi-Step request counts once
- [ ] pytest: a forwarded header from an untrusted address is ignored
