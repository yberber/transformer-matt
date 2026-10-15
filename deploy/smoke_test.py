"""Smoke test for a deployed site: Caddy in front of the inference server.

    python3 deploy/smoke_test.py http://<the VM's IP or domain>

Standard library only, so it runs on the VM or any machine with Python 3. It checks
that static files are served precompressed (brotli, gzip), that the API is proxied
under /api with zstd/gzip compression, that the access log holds only method, path
without query, status and timing, and that the rate limits key on the client IP that
Caddy forwards, not on one a client claims. Exhausting the tokenize limit is the last
check, so this client cannot use Live mode for a minute afterwards.
"""

import argparse
import json
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

# An access log entry has exactly these fields: when, how long, which request, what result.
ACCESS_LOG_FIELDS = {"ts", "duration", "status", "request"}
ACCESS_LOG_REQUEST_FIELDS = {"method", "uri"}
# An error entry may add what went wrong.
ERROR_LOG_FIELDS = {"level", "logger", "msg", "err_id", "err_trace"}
# Tokenize calls per client a minute (server.REQUESTS_PER_MINUTE).
TOKENIZE_LIMIT = 120
HEALTH_TIMEOUT = 300.0


def fetch(url: str, *, method: str = "GET", body: dict | None = None, headers: dict | None = None):
    """Status, headers and raw (still encoded) body; HTTP errors are returned, not raised."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def tokenize(base: str, prompt: str, headers: dict | None = None):
    return fetch(f"{base}/api/tokenize", method="POST", body={"prompt": prompt}, headers=headers)


class Checks:
    def __init__(self):
        self.failures: list[str] = []

    def check(self, ok: bool, description: str, detail: str = "") -> bool:
        print(f"{'ok  ' if ok else 'FAIL'} {description}{'' if ok else f': {detail}'}")
        if not ok:
            self.failures.append(description)
        return ok


def wait_for_health(base: str) -> tuple[int, bytes]:
    deadline = time.monotonic() + HEALTH_TIMEOUT
    while True:
        try:
            status, _, body = fetch(f"{base}/api/health")
        except OSError as error:
            status, body = 0, str(error).encode()
        if status == 200 or time.monotonic() > deadline:
            return status, body
        time.sleep(2)


def check_static(checks: Checks, base: str) -> None:
    _, _, index = fetch(f"{base}/")
    script = re.search(rb'src="/?(assets/[^"]+\.js)"', index)
    paths = ["/", "/data/examples/village.json"] + ([f"/{script[1].decode()}"] if script else [])
    checks.check(script is not None, "index.html links the app's script", index[:200].decode(errors="replace"))
    for path in paths:
        for encoding in ("br", "gzip"):
            status, headers, _ = fetch(f"{base}{path}", headers={"Accept-Encoding": encoding})
            got = headers.get("Content-Encoding")
            checks.check(status == 200 and got == encoding, f"{path} is served {encoding}", f"{status}, {got}")
            if path.endswith(".json"):
                content_type = headers.get("Content-Type", "")
                checks.check(content_type.startswith("application/json"), f"{path} is JSON", content_type)


def check_api(checks: Checks, base: str, prompt: str) -> None:
    for encoding in ("zstd", "gzip"):
        status, headers, _ = tokenize(base, prompt, {"Accept-Encoding": encoding})
        got = headers.get("Content-Encoding")
        checks.check(status == 200 and got == encoding, f"tokenize is proxied and answered {encoding}", f"{status}, {got}")


def check_access_log(checks: Checks, log_command: str, probe_path: str, secrets_sent: list[str]) -> None:
    log = subprocess.run(log_command, shell=True, capture_output=True, text=True)
    text = log.stdout + log.stderr
    if not checks.check(log.returncode == 0, "the access log can be read", text[-500:]):
        return
    entries = []
    for line in text.splitlines():
        try:
            entry = json.loads(line[line.index("{") :])
        except ValueError:
            continue
        if isinstance(entry, dict) and "request" in entry:
            entries.append(entry)
    probes = [entry for entry in entries if entry["request"].get("uri") == probe_path]
    checks.check(len(probes) == 1, "the probe request was logged, without its query", f"{len(probes)} entries")
    # Error entries (a 502 while the API starts, say) also carry the request.
    malformed = [
        entry
        for entry in entries
        if set(entry) - (ERROR_LOG_FIELDS if "err_id" in entry else set()) != ACCESS_LOG_FIELDS
        or set(entry["request"]) != ACCESS_LOG_REQUEST_FIELDS
        or "?" in entry["request"]["uri"]
    ]
    checks.check(
        not malformed, "every logged request holds only method, path, status and timing", json.dumps(malformed[:1])
    )
    leaked = [secret for secret in secrets_sent if secret in text]
    checks.check(not leaked, "no query string, header or Prompt text reaches the log", ", ".join(leaked))


def check_client_ip(checks: Checks, base: str, second_base: str | None) -> None:
    """Each tokenize call claims a different client in X-Forwarded-For. Caddy must
    replace the claim with the real client IP, so the calls share one limit."""
    limited = False
    # The earlier checks have made some of the calls already; a few spare ones are harmless.
    for n in range(TOKENIZE_LIMIT + 10):
        status, _, _ = tokenize(base, "Hello", {"X-Forwarded-For": f"203.0.113.{n + 1}"})
        if status == 429:
            limited = True
            break
    checks.check(limited, "a client cannot dodge the rate limit by claiming another IP", "never got 429")
    if second_base:
        status, _, _ = tokenize(second_base, "Hello")
        checks.check(status == 200, "another client IP has its own rate limit", str(status))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("url", help="the site, e.g. http://203.0.113.7 or https://example.com")
    parser.add_argument(
        "--access-log-command",
        default="docker compose logs --no-log-prefix caddy",
        help="a shell command that prints Caddy's log (default: %(default)s, run next to compose.yaml)",
    )
    parser.add_argument(
        "--second-url",
        help="the same site reached from another client address (e.g. http://[::1]), to check that "
        "the rate limits tell clients apart",
    )
    args = parser.parse_args()
    base = args.url.rstrip("/")
    second_base = args.second_url.rstrip("/") if args.second_url else None
    checks = Checks()
    marker = secrets.token_hex(6)
    query_secret, header_secret, prompt_secret = f"query{marker}", f"header{marker}", f"prompt{marker}"
    # Long enough that the response is over Caddy's minimum length for compressing.
    prompt = f"The quick brown fox {prompt_secret} jumps over the lazy dog " * 4

    status, body = wait_for_health(base)
    checks.check(status == 200, "Health through /api is ready", f"{status} {body[:200]!r}")
    check_static(checks, base)
    check_api(checks, base, prompt)
    probe_path = f"/smoke-{marker}"
    fetch(f"{base}{probe_path}?prompt={query_secret}", headers={"User-Agent": header_secret})
    time.sleep(1)  # Let the log reach its output.
    check_access_log(checks, args.access_log_command, probe_path, [query_secret, header_secret, prompt_secret])
    check_client_ip(checks, base, second_base)

    if checks.failures:
        print(f"\n{len(checks.failures)} check(s) failed.")
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
