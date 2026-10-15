# Inside the Transformer

A website that shows curious non-experts how GPT-2 small turns a piece of text into a continuation, step by step, with real numbers. Domain vocabulary (Prompt, Trace, Example, Position, …) is defined in [GLOSSARY.md](GLOSSARY.md); design decisions live in [docs/adr/](docs/adr/).

## Layout

| Path | What it holds |
| --- | --- |
| `python/` | The Python core (`inside_transformer`): tokenizes Prompts, runs GPT-2 greedily for a number of Steps and builds Traces. Also the regeneration script (`regenerate`) and the Example selection script (`regenerate.selection`). |
| `contract/trace.schema.json` | The committed contract schema, exported from the core's Pydantic models. |
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

## Test

```sh
cd python && uv run pytest     # Example files vs an independent Hugging Face greedy run, selection rules, regeneration reproduces the committed files, size budget, schema drift

cd web
npm run check                  # typecheck (svelte-check)
npm test                       # Vitest: Example files validate against the committed schema and match the web app's Example list; generated types are current; every translation key exists in all three languages
npx playwright install chromium   # once
npm run test:e2e               # Playwright against the built site
```

## UI text and languages

The UI is in English, Turkish and German. English in `web/src/lib/i18n/messages/en.ts` is the source; `tr.ts` and `de.ts` translate every key, and `npm test` fails if a key, `{parameter}` or technical term is missing in either. Technical terms (token, embedding, attention, layer) stay in English and are marked `[[term|text]]`, which renders the text with a short explanation from `term.<term>` in the reader's language. The Turkish and German drafts need native-speaker review before release.

View state (`example`, `view`, `step`, `lang`) lives in the query string, so a URL reopens the same view. `step` runs from 0 (the Prompt alone) to 16.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push. One job runs pytest, whose checks include schema drift and the check that regenerating reproduces the committed Example data. The other runs the typecheck, Vitest and Playwright. Python dependencies come from `uv sync --locked` and web dependencies from `npm ci`, with Node at the `.nvmrc` version. The pinned GPT-2 model is cached between runs under a key that contains its revision.

The workflow only runs once the repo has a GitHub remote. Add one and push (`git remote add origin <url> && git push -u origin main`) to start it.

## Regenerate Example data

```sh
cd python
uv run regenerate
```

This rewrites every Example file under `web/public/data/examples/` (each Prompt plus 16 greedy Steps) and copies the pinned model config to `web/public/data/gpt2-config.json`. Regeneration must reproduce the committed files, and `uv run pytest` checks that. Tokens, token IDs, headers and shapes must match exactly. Float32 values must match within the verification tolerances (probabilities within 1e-4), and near-tied predictions may swap ranks. Their last bits differ between CPUs: the committed files were generated on macOS arm64, and CI runs Linux x86_64. On the same machine, regeneration is byte-identical. Commit the regenerated files.

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
cd ../web && npm run gen:types
```

`uv run pytest` fails if `contract/trace.schema.json` differs from the export, and `npm test` fails if the generated TypeScript types differ from the schema.
