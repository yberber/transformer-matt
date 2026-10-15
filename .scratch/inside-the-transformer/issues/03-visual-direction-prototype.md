# 03: Visual-direction prototype

**What to build:** A throwaway prototype of the pipeline strip (Tokenize → Embed → Blocks ×12 → Predict) plus one view in the "specimen under glass" direction, in light and dark themes, so the user can approve or adjust the look before real views are built. Light theme: warm off-white paper with ink-blue lines. Dark theme: dark lab bench with phosphor-like token colors. Serif for explanations, monospace for numbers and tokens. The strip is drawn as one physical apparatus tokens flow through. See spec: Web app (visual direction).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The prototype shows the pipeline strip and one view with real-looking tokens in both themes
- [x] Token colors come from a 10-hue palette that meets WCAG AA contrast against both theme backgrounds
- [x] The prototype is kept separate from the production app and is clearly marked as throwaway
- [x] The user has reviewed the prototype, and the approved direction (or requested changes) is recorded under Comments in this ticket

## Comments

**Reviewed and approved (2026-10-15).** Question: does the "specimen under glass" direction work for the pipeline strip plus one view, in light and dark? Answer: yes, with variant A plus two parts of B.

The prototype is the primary source. It lives on the throwaway branch `prototype/visual-direction` (commits `17880a1`, `338311f`), not on main. Run it with `npm run prototype:visual` in `web/` on that branch. It offers three strip apparatuses (`?variant=A|B|C`) with the Predict view, on real GPT-2 values for "The lighthouse keeper wrote in his logbook that the storm had".

Approved direction for 04:

- **Strip: variant A, the bench tube with a return pipe.** Four glass stations (Tokenize, Embed, Blocks ×12 drawn as 12 rings, Predict) clamp one horizontal tube. Colored beads (tokens) sit inside the tube. A return pipe under the strip carries each chosen token back to the inlet; that is the only motion. Stations are buttons with `aria-current="step"`. On phones the stations shrink to their labels.
- **From B: data previews inside each stage box.** Tokenize shows mini token chips, Embed mini vector strips, Blocks 12 layer lines, and Predict mini top-10 bars. In the prototype the Embed miniature used made-up heights; build it from the real int8 strips.
- **From B: the "other 50,247 tokens" share in the Predict view.** Show the probability mass outside the top 10 next to the ranked list.
- **View frame: A's specimen card.** It has crop marks, a catalogue label (stage name, Step k / N) and a serif one-sentence lead. The top 10 is a ranked list with mono numbers; bars are scaled to the top candidate, and the top one is in the next Position's color.
- **Themes: approved as prototyped.**
  - Light: paper `#f6f1e6`, raised `#fbf8f1`, ink `#1b2333`, secondary `#4b5266`, faint `#736c5c`, lines `#24508f`.
  - Dark: bench `#101513`, raised `#171d1a`, ink `#e4e9e2`, secondary `#a7b0a8`, faint `#7f8a82`, lines `#6d8fb5`.
  - Both have a faint 32px grid behind the page. Token chips glow only in dark.
  - Serif is `"Iowan Old Style", Charter, Georgia`; mono is `ui-monospace`.
  - Every text color is at least 4.5:1 on both surfaces.
- **Token palette: approved.** It is 10 hues in a fixed order (blue, orange, green, brown, pink, ochre, violet, red, cyan, olive), one palette per theme. The order was searched for the best worst-case adjacent CVD separation, with the 10 → 1 pair included.
  - Light: `#2a64c4 #c8541c #13895c #9e5418 #c94f86 #a87800 #6a4fcf #cc3b3b #0f8aa3 #5b7a14`. Contrast is 3.48–5.45:1; CVD worst is 7.4 and normal-vision worst is 16.5.
  - Dark: `#6aa8ff #ff9a52 #3ee0a0 #e0a368 #ff7fbf #f2c94c #b49cff #ff6b6b #4fd8f0 #a6dc4e`. Contrast is 6.17–11.62:1; CVD worst is 7.1 and normal-vision worst is 17.3.
  - Both palettes meet WCAG AA non-text contrast (3:1). The CVD values fall in the validator's floor band, which is allowed only because token text always accompanies color in the view.
  - The dark hues sit deliberately above the dataviz lightness band to get the phosphor look.
  - These values replace the palette from 01 in `web/src/styles.css`.
- **Strip beads are decorative.** They are color-only and `aria-hidden`; the view's chips, which always carry text, identify tokens. The user accepted this.
- **Reduced motion:** Svelte transitions bypass the CSS `animation: none` rule (they use the Web Animations API), so set their duration to 0 explicitly.

**Note for later, not in scope now:** the goal is that beginners understand the architecture. A future change will let the Blocks station expand in place to show one block's internals, with data flowing through it: layer norm → Q, K, V → attention heads → add → layer norm → MLP 768→3072→768 → add. Keep the strip compatible with that. Blocks is a station that can grow inside the tube, so it must not be a fixed-size box.
