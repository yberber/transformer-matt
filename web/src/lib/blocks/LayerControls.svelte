<script lang="ts">
  // Steps through the layers: previous, one button per layer, and next. Each layer's
  // button also shows the logit lens's top guess after that layer, so the guess can be
  // watched forming. The layer lives in the URL, shared with the attention view.
  import { navigate, route } from "../app/route.svelte";
  import { t } from "../i18n/i18n";
  import { spokenToken } from "../tokens/spoken";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Token } from "../trace/decode";

  // guesses: the logit lens's top token after each layer, layer by layer.
  let { guesses }: { guesses: Token[] } = $props();

  const layers = $derived(guesses.length);

  function go(layer: number) {
    navigate({ layer: Math.max(1, Math.min(layers, layer)) }, { replace: true });
  }
</script>

<div class="layers" role="group" aria-label={t("blocks.layers")}>
  <button type="button" class="control" disabled={route.layer === 1} onclick={() => go(route.layer - 1)}>
    <span aria-hidden="true">←</span>
    {t("blocks.previous")}
  </button>
  <ol class="rail">
    {#each guesses as guess, i (i)}
      <li>
        <button
          type="button"
          class="layer"
          aria-current={route.layer === i + 1 ? "true" : undefined}
          onclick={() => go(i + 1)}
        >
          <span class="visually-hidden">{t("blocks.layerButton", { n: i + 1, token: spokenToken(guess.tokenBytes) })}</span>
          <span class="n" aria-hidden="true">{i + 1}</span>
          <span class="guess" aria-hidden="true"><TokenText bytes={guess.tokenBytes} plain /></span>
        </button>
      </li>
    {/each}
  </ol>
  <button type="button" class="control" disabled={route.layer === layers} onclick={() => go(route.layer + 1)}>
    {t("blocks.next")}
    <span aria-hidden="true">→</span>
  </button>
  <span class="status" role="status">{t("blocks.layerOf", { layer: route.layer, layers })}</span>
  <p class="hint">{t("blocks.guesses")}</p>
</div>

<style>
  .layers {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin: 1.25rem 0 1.5rem;
  }
  .control:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .rail {
    flex: 1 1 30rem;
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .layer {
    display: grid;
    justify-items: center;
    width: 100%;
    padding: 0.25rem 0.15rem 0.3rem;
    border: 1px solid var(--line-soft);
    border-radius: 4px;
    background: var(--paper-raised);
    cursor: pointer;
  }
  .layer[aria-current="true"] {
    border-color: var(--line);
    box-shadow: inset 0 0 0 1.5px var(--line);
  }
  .n {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-secondary);
  }
  .layer[aria-current="true"] .n {
    color: var(--line);
    font-weight: 700;
  }
  .guess {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    white-space: pre;
  }
  .status {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .hint {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }

  /* On phones the rail takes its own rows, six layers to a row. */
  @media (width < 640px) {
    .rail {
      order: -1;
      flex-basis: 100%;
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }
</style>
