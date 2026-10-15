# 02: CI pipeline

**What to build:** Every push runs the full test suite on GitHub Actions, so regressions in data, contract, server or web app are caught automatically. The Hugging Face model is cached between runs. The workflow is ready to run as soon as a GitHub remote is added. See spec: Repo and CI.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] A GitHub Actions workflow runs pytest, Vitest and Playwright
- [x] The workflow fails when the schema exported from the Pydantic models differs from the committed one
- [x] The workflow fails when regenerating Example data does not produce byte-identical files
- [x] The pinned Hugging Face model is cached between runs
- [x] Python dependencies install via uv and web dependencies via npm, using the pinned Node version
- [x] README notes that CI needs a GitHub remote

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- The schema drift and byte-identical regeneration checks are the existing pytest tests. CI runs them through `uv run pytest`, with no separate steps.
- The workflow has never run on GitHub. It passes actionlint, and each step passes when run locally, but there is no remote yet.
- The model cache key is the pinned revision. A pre-download step fills it with the config, tokenizer and `model.safetensors`, because an exact cache hit is never re-saved. If the core starts loading another file, add it to `allow_patterns` in `.github/workflows/ci.yml`.
- On Linux, torch comes from PyTorch's CPU-only index (`[tool.uv.sources]` in `python/pyproject.toml`), so CI doesn't install several GB of CUDA libraries. macOS keeps PyPI's torch, which is already CPU-only.
- Regeneration is byte-identical on macOS today, because the Trace holds only tokens. Once Traces carry floats (05+), byte identity between the macOS-generated files and the Linux CI run needs watching.
