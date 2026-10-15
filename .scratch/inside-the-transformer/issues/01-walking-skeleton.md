# 01: Walking skeleton: tokenize one Example end to end

**What to build:** A user opens the site and sees one Example's Prompt split into tokens, with real GPT-2 token IDs coming from a committed Example file. This proves the whole path: the Python core builds a minimal Trace (header plus per-Position token ID, text and bytes), the regeneration script writes it as an Example file, the committed contract schema describes it, and the web app decodes it and renders a tokenization view. Both stacks are set up here (uv for Python; Svelte 5, Vite and npm for the web app, with the Node version pinned), with test commands and the first README sections. See spec: Trace (shared format), Contract, Web app, ADR 0001.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The Python core takes a Prompt and returns a Trace whose header carries the model ID, pinned model revision and the config values used, and whose position records carry token ID, token text and raw bytes; torch, transformers and the model revision are pinned exactly
- [x] No `<|endoftext|>` token is prepended (ADR 0003)
- [x] The Trace is defined by Pydantic models; the exported schema is committed, TypeScript types are generated from it, and a check fails when the export differs from the committed schema
- [x] The regeneration script writes one placeholder Example file (readable JSON and brotli-compressed) and copies the pinned model config into the web app's data
- [x] Encoding is JSON for structure with base64 for typed arrays; the web app has one Trace decoder
- [x] The web app loads the Example file and renders its tokens: leading space as a faint dot, newline as ↵, tab as →, incomplete UTF-8 bytes as a byte marker with a tooltip; details show raw bytes and token ID
- [x] Each token is colored by Position from a validated 10-hue palette assigned in order and cycling, and token text always accompanies color
- [x] pytest: an independent Hugging Face tokenization (not using the core) matches the Example file's tokens exactly
- [x] pytest: regenerating produces byte-identical files
- [x] pytest: each Example file is under 300 KB brotli-compressed
- [x] Vitest: every Example file validates against the committed schema
- [x] Playwright: "open Example" shows the Prompt's tokens
- [x] README explains how to run, test and regenerate Example data

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- Palette (03): the 10 hues are the dataviz reference palette plus cyan and brown, checked with its `validate_palette.js` against the default light and dark surfaces, cyclic pair included. The result is recorded in a comment in `web/src/styles.css`, not in a test. Re-validate against the final theme surfaces.
- Byte-marker tooltip (04): it opens on hover and keyboard focus only, with no tap path on touch screens.
- Every space renders as a faint dot, not only a leading one, so whitespace-only tokens stay visible.
- `token_text` holds U+FFFD for partial characters. Render from `token_bytes`.
- The placeholder Example is meant to be replaced by the six selected Examples in 05. The Playwright expectations are literal and must be updated with it.
