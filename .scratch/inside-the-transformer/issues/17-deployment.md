# 17: Deployment

**What to build:** An operator deploys the whole site to one Oracle Cloud VM (Ampere A1 ARM assumed) with Docker Compose. Caddy serves the static build with precompressed files, proxies the API, compresses API responses, and keeps access logs to method, path without query, status and timing. The site address is one variable that defaults to plain HTTP on the VM's IP; setting it to a domain turns on automatic TLS. The API image is built for arm64 with the model weights baked in. See spec: Deployment, ADR 0002.

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] Docker Compose runs Caddy and the API container
- [ ] The API image is built for arm64 with the pinned model weights baked in
- [ ] Caddy serves precompressed brotli/gzip static files and compresses API responses with zstd/gzip
- [ ] Caddy access logs record only method, path without query, status and timing
- [ ] Caddy forwards the client IP to the API in the header the rate limiter trusts
- [ ] One site-address variable defaults to plain HTTP on the VM's IP; setting a domain enables automatic TLS
- [ ] README explains how to deploy, including adding a domain later
