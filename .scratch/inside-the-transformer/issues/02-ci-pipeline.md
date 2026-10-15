# 02: CI pipeline

**What to build:** Every push runs the full test suite on GitHub Actions, so regressions in data, contract, server or web app are caught automatically. The Hugging Face model is cached between runs. The workflow is ready to run as soon as a GitHub remote is added. See spec: Repo and CI.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A GitHub Actions workflow runs pytest, Vitest and Playwright
- [ ] The workflow fails when the schema exported from the Pydantic models differs from the committed one
- [ ] The workflow fails when regenerating Example data does not produce byte-identical files
- [ ] The pinned Hugging Face model is cached between runs
- [ ] Python dependencies install via uv and web dependencies via npm, using the pinned Node version
- [ ] README notes that CI needs a GitHub remote
