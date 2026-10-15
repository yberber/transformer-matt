# 04: App shell

**What to build:** The site's frame in the approved visual direction: the persistent pipeline strip, light and dark themes following the system setting with a toggle, the view pattern (one-sentence plain-language explanation first, exact numbers behind "Show details"), and the UI in English, Turkish and German. The language defaults to the browser language with English as fallback, and technical terms stay in English with a short localized explanation. View state (example, view, lang) lives in the query string so a URL reopens the same view, and a copy-link control shares it, falling back to a pre-selected text field where the clipboard API is unavailable (plain HTTP). The site notes that GPT-2 continues text rather than answering, and why Examples are in English. See spec: Web app, i18n.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] The pipeline strip is always visible and navigates between stages; the tokenization view from 01 lives inside it
- [ ] Each view leads with its one-sentence explanation and has a "Show details" control
- [ ] Light and dark themes follow the system setting, can be toggled, and meet WCAG AA contrast
- [ ] English, Turkish and German UI text; default from the browser language with English as fallback; switching language at any time
- [ ] Technical terms (token, attention, embedding, layer) stay in English with a short explanation in each language
- [ ] A note explains that GPT-2 is a text-completion model, and another explains why Examples are in English
- [ ] example, view and lang are in the query string; opening a URL restores them
- [ ] A copy-link control copies the current URL, with a pre-selected text field fallback when the clipboard API is unavailable
- [ ] All controls are keyboard-operable with visible focus; the layout works on phone widths
- [ ] Vitest: every translation key exists in all three languages
- [ ] Playwright: "switch language" and "open shared URL"
