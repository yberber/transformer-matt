# 17: Deployment

**What to build:** An operator deploys the whole site to one Oracle Cloud VM (Ampere A1 ARM assumed) with Docker Compose. Caddy serves the static build with precompressed files, proxies the API, compresses API responses, and keeps access logs to method, path without query, status and timing. The site address is one variable that defaults to plain HTTP on the VM's IP; setting it to a domain turns on automatic TLS. The API image is built for arm64 with the model weights baked in. See spec: Deployment, ADR 0002.

**Blocked by:** 13

**Status:** ready-for-agent

- [x] Docker Compose runs Caddy and the API container
- [x] The API image is built for arm64 with the pinned model weights baked in
- [x] Caddy serves precompressed brotli/gzip static files and compresses API responses with zstd/gzip
- [x] Caddy access logs record only method, path without query, status and timing
- [x] Caddy forwards the client IP to the API in the header the rate limiter trusts
- [x] One site-address variable defaults to plain HTTP on the VM's IP; setting a domain enables automatic TLS
- [x] README explains how to deploy, including adding a domain later

## Comments

**Implemented (2026-10-15).** Notes for later tickets and for the first real deploy:

- **Files:** `compose.yaml` (root), `deploy/Caddyfile`, `web/Dockerfile` (a Node build stage, then `npm run precompress`, then `caddy:2.11.7-alpine` with the build in `/srv`), and `python/Dockerfile` (uv `--locked --no-dev`, with `inside_transformer.load()` run at build time and `HF_HUB_OFFLINE=1` at runtime). There is also `deploy/smoke_test.py` (stdlib only).
- **Verified:** with a Caddy 2.11.7 binary in front of `uv run serve`, every smoke-test check passes. Two mutations to Caddy's `X-Forwarded-For` handling (trusting all proxies, and stripping the header) each make a client-IP check fail. **The Dockerfiles and `compose.yaml` were never built or run**, because Docker isn't installed on the dev machine. The first `docker compose up -d --build` on the VM, followed by `python3 deploy/smoke_test.py http://localhost`, is their first test.
- **Error log:** Caddy's error log (`http.log.error`, e.g. a 502 while the API starts) carries the full request, query string, headers and IP included. The Caddyfile routes it through the same field filter as the access log.
- **Client IP:** the API trusts `X-Forwarded-For` only from Caddy's fixed address (`172.30.0.2` on the `172.30.0.0/24` Compose network). IPv4 clients keep their own address through Docker's DNAT. Over IPv6 they would all share one rate limit (README, Deploy).
