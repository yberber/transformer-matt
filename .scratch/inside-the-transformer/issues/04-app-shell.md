# 04: App shell

**What to build:** The site's frame in the approved visual direction: the persistent pipeline strip, light and dark themes following the system setting with a toggle, the view pattern (one-sentence plain-language explanation first, exact numbers behind "Show details"), and the UI in English, Turkish and German. The language defaults to the browser language with English as fallback, and technical terms stay in English with a short localized explanation. View state (example, view, lang) lives in the query string so a URL reopens the same view, and a copy-link control shares it, falling back to a pre-selected text field where the clipboard API is unavailable (plain HTTP). The site notes that GPT-2 continues text rather than answering, and why Examples are in English. See spec: Web app, i18n.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [x] The pipeline strip is always visible and navigates between stages; the tokenization view from 01 lives inside it
- [x] Each view leads with its one-sentence explanation and has a "Show details" control
- [x] Light and dark themes follow the system setting, can be toggled, and meet WCAG AA contrast
- [x] English, Turkish and German UI text; default from the browser language with English as fallback; switching language at any time
- [x] Technical terms (token, attention, embedding, layer) stay in English with a short explanation in each language
- [x] A note explains that GPT-2 is a text-completion model, and another explains why Examples are in English
- [x] example, view and lang are in the query string; opening a URL restores them
- [x] A copy-link control copies the current URL, with a pre-selected text field fallback when the clipboard API is unavailable
- [x] All controls are keyboard-operable with visible focus; the layout works on phone widths
- [x] Vitest: every translation key exists in all three languages
- [x] Playwright: "switch language" and "open shared URL"

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- View state is `?example=…&view=tokenize|embed|blocks|predict&lang=en|tr|de` (`web/src/lib/app/viewState.ts`). Unknown values fall back to defaults. On first load, the URL is rewritten to include all three values, so a copied link carries the sender's language (story 69). Changing view or Example pushes a history entry; changing language replaces it. Later tickets add `layer`, `head` and `step` there.
- Examples are listed in `web/src/lib/trace/examples.ts` (only `placeholder` for now); 05 replaces the list and adds the picker.
- Embed, Blocks and Predict render `PendingView`: the lead sentence, a "still being built" note, and config numbers behind "Show details". 07, 09 and 05 replace it with the real views inside `ViewFrame`.
- Carried forward from the approved direction (03):
  - The catalogue label shows "No. 0n" but not "Step k / N" yet (05).
  - The strip previews exist for Tokenize (chips) and Blocks (12 rings). Embed's mini strips need the int8 embeddings (07), and Predict's mini bars need the top-10 (05).
  - The return pipe is static; its motion belongs to 18.
- UI text: `web/src/lib/i18n/messages/{en,tr,de}.ts`. `[[term|text]]` marks a technical term, which renders as a button that expands a localized explanation. Only the four view leads use term markers; labels such as "Attention heads per layer" mention terms without one. The Vitest check also requires that `{parameters}` and term markers match English.
- The theme toggle stores an explicit pick in localStorage. Picking the theme that matches the system goes back to following the system. An inline script in `index.html` applies the stored pick before paint and shares the storage key with `web/src/lib/shell/theme.ts`.
- Live links (16): `CopyLink` derives its URL from the route state. Once the Prompt travels in the fragment, make it react to fragment changes too.
- Checked by hand: axe-core 4.10 reported no violations (contrast included) on all four stages in both themes, at 1280 and 360 px, in all three languages. Tabbing reaches every control with a visible focus ring, and nothing overflows horizontally at 320–375 px. 06 makes axe a CI gate.
