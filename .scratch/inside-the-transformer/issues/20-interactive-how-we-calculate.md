# 20: Interactive "How we calculate"

**What to build:** The "How we calculate" page gains a context-length slider that drives the same Estimates functions the statistics views use, so the user can see each formula's value change with context length. See spec: Web app (Estimates module, "How we calculate").

**Blocked by:** 11

**Status:** ready-for-agent

- [x] A context-length slider updates every formula's computed value live
- [x] The values come from the shared Estimates module, not a separate implementation
- [x] The slider is keyboard-operable and announces its value
- [x] The page remains readable without the slider, in all three languages

## Comments

**Implemented (2026-10-15).** Notes for later tickets:

- **Where.** `HowWeCalculateView.svelte` has a native range input, "Context length n", from 1 to n_positions. It sits after the symbols, with a one-line note above it. It stays pinned at the top (sticky) while the formulas scroll past.
  - It starts at the text on screen: `App` passes `positions` (P + s). With no text loaded (Live mode before a run), it starts at 1024.
  - Once moved, it keeps its value when the Example or Step changes. It is not in the URL, like ticket 12's chart reader.
- **What follows it.** Each value line sits under its symbolic formula, drawn with a dashed rule so it reads apart from formulas that hold at every n. The values come from `decodeFlops`, `prefillFlops` and `kvCacheBytes`:
  - an "At n = …" column in the per-layer table, and one layer's total;
  - decode(n);
  - prefill(n) and prefill(n) / n;
  - the text so far, with P + s = n, and the next token, decode(n + 1), shown only below 1024;
  - the KV cache in bytes, plus the size in words.
  - The symbolic formulas are unchanged, so the page still reads without the slider.
- **Accessibility.** `aria-valuetext` reads "17 Positions" (reusing `stats.positions.*`) and a visible `<output>` shows the same text. The keyboard is the browser's own: arrows, PageUp/PageDown, Home/End.
- **Tests.** The `statistics.spec.ts` test "explore the formulas at any context length" covers:
  - the start at 17 (village, Step 5);
  - End → 1024, then ArrowLeft → 1023;
  - each value against hand-worked numbers;
  - Turkish and German labels, and number formats.
  - Axe and the 375 px phone test already covered `view=calculate`. The start at 1024 with no text loaded is not tested.
- **Translations.** The new `calc.lengthLabel`, `calc.lengthNote`, `calc.atLength` and `calc.kvAt` are agent drafts (ticket 21).
- **Glossary gap.** "Context length" is now a UI label, as on the statistics page, but it is not in GLOSSARY.md.
