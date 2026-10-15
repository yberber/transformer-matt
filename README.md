# Inside the Transformer

A website that shows curious non-experts how GPT-2 small turns a piece of text into a continuation, step by step, with real numbers. Domain vocabulary (Prompt, Trace, Example, Position, …) is defined in [GLOSSARY.md](GLOSSARY.md); design decisions live in [docs/adr/](docs/adr/).

## Layout

| Path | What it holds |
| --- | --- |
| `python/` | The Python core (`inside_transformer`): tokenizes Prompts and builds Traces. Also the regeneration script (`regenerate`). |
| `contract/trace.schema.json` | The committed contract schema, exported from the core's Pydantic models. |
| `web/` | The web app (Svelte 5, Vite, TypeScript). |
| `web/public/data/` | Generated Example files (readable `.json` and brotli `.json.br`) and the pinned GPT-2 config. |

## Prerequisites

- [uv](https://docs.astral.sh/uv/) for Python. It installs Python 3.12 and the exactly pinned torch and transformers versions.
- Node.js at the version in [`.nvmrc`](.nvmrc) (`nvm use`, or install that version) and npm.

The model is GPT-2 small (`openai-community/gpt2`) at a pinned revision; the first Python run downloads it from Hugging Face into `~/.cache/huggingface`. Building and running the web app needs neither Python nor the model.

## Run the web app

```sh
cd web
npm ci
npm run dev        # development server at http://localhost:5173
npm run build      # static build in web/dist
```

## Test

```sh
cd python && uv run pytest     # Example files vs an independent Hugging Face run, byte-identical regeneration, size budget, schema drift

cd web
npm run check                  # typecheck (svelte-check)
npm test                       # Vitest: Example files validate against the committed schema; generated types are current
npx playwright install chromium   # once
npm run test:e2e               # Playwright against the built site
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push. One job runs pytest, whose checks include schema drift and byte-identical regeneration. The other runs the typecheck, Vitest and Playwright. Python dependencies come from `uv sync --locked` and web dependencies from `npm ci`, with Node at the `.nvmrc` version. The pinned GPT-2 model is cached between runs under a key that contains its revision.

The workflow only runs once the repo has a GitHub remote. Add one and push (`git remote add origin <url> && git push -u origin main`) to start it.

## Regenerate Example data

```sh
cd python
uv run regenerate
```

This rewrites every Example file under `web/public/data/examples/` and copies the pinned model config to `web/public/data/gpt2-config.json`. Regeneration is deterministic: running it again must produce byte-identical files, and `uv run pytest` checks that. Commit the regenerated files.

## Change the contract

The Trace is both the Example file format and the Live API response (ADR 0001), so its Pydantic models in `python/src/inside_transformer/trace.py` are the single source of truth. After changing them:

```sh
cd python && uv run export-schema && uv run regenerate
cd ../web && npm run gen:types
```

`uv run pytest` fails if `contract/trace.schema.json` differs from the export, and `npm test` fails if the generated TypeScript types differ from the schema.
