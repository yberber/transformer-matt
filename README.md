# Inside the Transformer

A website that shows curious non-experts how GPT-2 small turns a piece of text into a continuation, step by step, with real numbers. Domain vocabulary (Prompt, Trace, Example, Position, …) is defined in [GLOSSARY.md](GLOSSARY.md); design decisions live in [docs/adr/](docs/adr/).

## Layout

| Path | What it holds |
| --- | --- |
| `python/` | The Python core (`inside_transformer`): tokenizes Prompts, runs GPT-2 greedily for a number of Steps and builds Traces. Also the inference server (`server`), the regeneration script (`regenerate`) and the Example selection script (`regenerate.selection`). |
| `contract/trace.schema.json` | The committed contract schema for the Trace (the Example file format), exported from the core's Pydantic models. |
| `contract/api.schema.json` | The committed contract schema for the inference server's requests and responses, exported the same way. |
| `web/` | The web app (Svelte 5, Vite, TypeScript). |
| `web/public/data/` | Generated Example files (readable `.json` and brotli `.json.br`) and the pinned GPT-2 config. |

## Prerequisites

- [uv](https://docs.astral.sh/uv/) for Python. It installs Python 3.12 and the exactly pinned torch and transformers versions. On Linux, torch comes from PyTorch's CPU-only index, which avoids the CUDA libraries.
- Node.js at the version in [`.nvmrc`](.nvmrc) (`nvm use`, or install that version) and npm.

The model is GPT-2 small (`openai-community/gpt2`) at a pinned revision; the first Python run downloads it from Hugging Face into `~/.cache/huggingface`. Building and running the web app needs neither Python nor the model.

## Run the web app

```sh
cd web
npm ci
npm run dev        # development server at http://localhost:5173
npm run build      # static build in web/dist
```

Example mode needs nothing else. Live mode calls the inference server under `/api`: the dev and preview servers forward `/api/*` to `API_URL` with the prefix removed (default `http://127.0.0.1:8000`, where `uv run serve` listens), as the reverse proxy does in production. Without a server, Live mode says the server is unavailable and offers one click back to Example mode.

## Run the inference server

Live mode runs the user's own Prompt on a small CPU inference server (FastAPI on uvicorn, one worker process) over the same Python core:

```sh
cd python
uv run serve       # http://127.0.0.1:8000; set HOST and PORT to change it
```

Set `TRUSTED_PROXIES` to the reverse proxy's addresses (comma-separated IPs or CIDR ranges, default `127.0.0.1,::1`). The rate limits read a client's IP from `X-Forwarded-For` only in requests that come from one of these addresses. For any other request they use the connecting address and ignore the header.

The model loads in the background after startup, and `GET /health` answers 503 `{"status": "loading"}` until it is ready, then 200 `{"status": "ready"}`. Forward passes run in a pool of two threads, and torch's thread count is set to the available cores divided between them.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /tokenize` | `{"prompt": "…"}` | `{"tokens": [{token_id, token_text, token_bytes}], "count": n}`. The count may exceed 64, so the web app can show "70 / 64". |
| `POST /step` | `{"prompt": "…", "advance": k}`, or `{"token_ids": […], "prompt_length": p, "advance": k}` | The Trace's header and `prompt_length`, `first_position`, and the records of the new Positions (`first_position` on). |
| `GET /health` | | `{"status": "loading" \| "ready"}` |

With Prompt text, Step runs the Prompt and takes `k` Steps, and the response holds every Position from 0: it has the shape of an Example file, plus `first_position: 0`. With token IDs (the Prompt and the Continuation so far), Step reruns them, takes `k` more Steps and returns only the `k` new Positions, starting at `first_position` = the number of IDs sent. The Continuation is never re-tokenized. `advance` 0 is prefill only, 1 is the next token, and `N` restores a shared Live link in one request. The KV cache is reused across the Steps of one request.

Errors return `{"code": …, "message": …}`. The web app words its own message from `code`, and `message` is for developers. Limit errors are 422 with code `prompt_too_long` (more than 64 Prompt tokens) or `continuation_too_long` (more than 64 Continuation tokens in all). Other 422 codes are `empty_prompt` and `invalid_request`. While the model loads, tokenize and Step return 503 `model_loading`. An unknown path is 404 `not_found`, and a wrong method is 405 `method_not_allowed`. Every response matches `contract/api.schema.json`. Two Step requests can run side by side, each in its own forward-pass thread, and further ones wait for a free thread.

Each client IP may make 120 tokenize calls and 60 Step requests a minute, and have at most 2 tokenize or Step requests in flight. A Step request counts once however many Steps it takes, so restoring a shared Live link costs one. Over a limit, the server answers 429 `rate_limited` with a `Retry-After` header in seconds. For the per-minute limits, that is the time until the client's oldest counted request is a minute old. For requests in flight, it is 1. Refused requests are not counted. The counts live in memory only, and a client's are dropped within two minutes of its last request.

The server never logs a request body or Prompt text, and stores nothing. uvicorn's access log is off, because it would record query strings. The reverse proxy keeps the access log instead. `uv run pytest` runs a real server and fails if any Prompt text reaches a log record (at any level), stdout or stderr.

## Test

```sh
cd python && uv run pytest     # Example files vs an independent Hugging Face greedy run (tokens, predictions, embeddings, attention, MLP impact, logit lens), selection rules, regeneration reproduces the committed files, size budget, schema drift; the inference server's API against the real model (responses validate against the committed schema, each Example Prompt with `advance` 16 matches its Example file, limit errors, health while loading, no Prompt text in logs, each rate limit's 429 with Retry-After, a forwarded client IP trusted only from a trusted proxy)

cd web
npm run check                  # typecheck (svelte-check)
npm test                       # Vitest: Example files and Live-API fixtures validate against the committed schemas; Example files match the web app's Example list; generated types are current; every translation key exists in all three languages
npx playwright install chromium   # once
npm run test:e2e               # Playwright against the built site and the real inference server, including the axe checks
npm run lighthouse             # Lighthouse CI on the built site: performance at least 90, initial page load under 2 MB
```

The axe checks in `web/e2e/accessibility.spec.ts` run on every main view in the light and the dark theme, both as the system setting gives them and as the theme toggle picks them, with every "Show details" open, and fail on any violation. To add a view, add its URL to `MAIN_VIEWS` in that file:

```ts
const MAIN_VIEWS = [
  "/?example=village&view=tokenize&step=5&lang=en",
  // …
  "<the new view's URL>",
];
```

The checks run at the desktop viewport, so a layout that exists only on narrow screens needs its own test.

`npm run test:e2e` starts three servers (or reuses ones already running, outside CI): the inference server (`uv run serve` on port 8000, counted as up once Health reports ready, so the first run waits for the model to load), the built site on port 4173 with `/api` forwarded to it, and a second copy of the built site on port 4174 whose `/api` leads to no server, for the "Live mode with server unavailable" scenarios. The Live-mode scenarios live in `web/e2e/live-mode.spec.ts` and `web/e2e/live-mode-unavailable.spec.ts`.

The Live-API fixtures in `web/tests/fixtures/live/` are real inference-server responses. `npm run record:fixtures` re-records them: it starts the server on a spare port, records the loading-state responses while the model loads, then the rest.

Lighthouse CI (`web/lighthouserc.cjs`) runs in Example mode on the landing page and on the longest Example, three times each, and checks the median run. It uses Lighthouse's default mobile emulation and throttling, and Playwright's Chromium, so `npx playwright install chromium` covers it too. Reports land in `web/.lighthouseci/reports`.

## UI text and languages

The UI is in English, Turkish and German. English in `web/src/lib/i18n/messages/en.ts` is the source; `tr.ts` and `de.ts` translate every key, and `npm test` fails if a key, `{parameter}` or technical term is missing in either. Technical terms (token, embedding, attention, layer) stay in English and are marked `[[term|text]]`, which renders the text with a short explanation from `term.<term>` in the reader's language. The Turkish and German drafts need native-speaker review before release.

View state (`mode`, `example`, `view`, `layer`, `head`, `step`, `lang`) lives in the query string, so a URL reopens the same view. `mode` is `example` (the default) or `live`. `layer` and `head` run from 1 to 12, as the UI counts them; `step` runs from 0 (the Prompt alone) to 16 in Example mode and to 64 in Live mode. A Live run's Trace is held in the browser only, so a reloaded Live-mode URL opens Live mode at Step 0 with an empty Prompt. The `attention` view is not a station of the pipeline strip: it opens up one layer and head of Blocks, so the strip marks Blocks while it is shown. The Blocks view and the attention view share `layer`, so the Blocks view's link opens the heatmap at the layer being shown.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push. One job runs pytest, whose checks include schema drift and the check that regenerating reproduces the committed Example data. The other runs the typecheck, Vitest, Playwright (with the axe checks, and with the real inference server, so it installs the Python core and the cached model too) and Lighthouse CI, and uploads the Lighthouse reports when a step fails. Python dependencies come from `uv sync --locked` and web dependencies from `npm ci`, with Node at the `.nvmrc` version. The pinned GPT-2 model is cached between runs under a key that contains its revision.

The workflow only runs once the repo has a GitHub remote. Add one and push (`git remote add origin <url> && git push -u origin main`) to start it.

## Regenerate Example data

```sh
cd python
uv run regenerate
```

This rewrites every Example file under `web/public/data/examples/` (each Prompt plus 16 greedy Steps) and copies the pinned model config to `web/public/data/gpt2-config.json`. Regeneration must reproduce the committed files, and `uv run pytest` checks that. Tokens, token IDs, headers and shapes must match exactly. Float32 values must match within the verification tolerances (probabilities, logit-lens ones included, within 1e-4; the first 16 embedding dimensions within 1e-6; norms, int8 scales and MLP impacts within 1e-5 relative), int8 embedding values and uint8 attention weights may move by one step, and near-tied predictions and logit-lens tokens may swap ranks. Their last bits differ between CPUs: the committed files were generated on macOS arm64, and CI runs Linux x86_64. On the same machine, regeneration is byte-identical. Commit the regenerated files.

### Choose the Examples

```sh
cd python
uv run select-examples
```

This runs every drafted candidate Prompt in `src/regenerate/selection.py` and checks it against the selection rules from the spec. A candidate's Prompt length must fall in its band (short 8–12, medium 22–28, long 44–48 tokens). Its 16 Continuation tokens must not repeat a token 3-gram, the top-1 must beat the top-2 by at least 0.001 at every Step, there must be no newline-only token, and the Prompt must not be a question. The script then prints the two qualifying candidates with the largest minimum margin in each band, keeping at least one word split into several tokens. Read the printed Continuations for anything offensive, since no script can check that. Then copy the selection into `EXAMPLES` in `src/regenerate/__init__.py` and the web app's list in `web/src/lib/trace/examples.ts`, and regenerate.

## Change the contract

The Trace is both the Example file format and the Live API response (ADR 0001), so its Pydantic models in `python/src/inside_transformer/trace.py` are the single source of truth. After changing them:

```sh
cd python && uv run export-schema && uv run regenerate
cd ../web && npm run gen:types && npm run record:fixtures
```

`uv run export-schema` writes both `contract/trace.schema.json` and `contract/api.schema.json`; the server's request and response models live in `python/src/inside_transformer/api.py`. `uv run pytest` fails if either committed schema differs from the export, and `npm test` fails if the generated TypeScript types (`web/src/lib/trace/trace.generated.ts` and `web/src/lib/live/api.generated.ts`) differ from the schemas, or if a Live-API fixture no longer validates.
