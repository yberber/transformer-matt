<script lang="ts">
  // The persistent pipeline strip: one glass tube clamped by four stations, with
  // a return pipe that carries each chosen token back to the inlet. Stations are
  // the navigation; the beads in the tube are decorative (the views' token chips
  // carry the text).
  import { navigate, route } from "../app/route.svelte";
  import { VIEWS, type View } from "../app/viewState";
  import { formatNumber, t, tPlural } from "../i18n/i18n";
  import { positionColor } from "../tokens/color";
  import type { Trace } from "../trace/decode";

  let { trace }: { trace: Trace | undefined } = $props();

  const positionCount = $derived(trace?.positions.length ?? 0);
  const predictions = $derived(trace?.positions.at(-1)?.predictions ?? []);
  const config = $derived(trace?.header.config);

  function spec(view: View): string {
    if (!config) return "";
    switch (view) {
      case "tokenize":
        return tPlural("stage.spec.tokens", positionCount);
      case "embed":
        return `${formatNumber(positionCount)} × ${formatNumber(config.n_embd)}`;
      case "blocks":
        return t("stage.spec.layers", { n: config.n_layer });
      case "predict":
        return t("stage.spec.predict", { n: config.vocab_size });
    }
  }
</script>

<nav class="apparatus" aria-label={t("pipeline.label")}>
  <div class="rig">
    <span class="port" aria-hidden="true">{t("pipeline.inlet")}</span>
    {#each VIEWS as view, i (view)}
      <button
        type="button"
        class="station"
        class:blocks={view === "blocks"}
        aria-current={route.view === view ? "step" : undefined}
        onclick={() => navigate({ view })}
      >
        <span class="name"
          >{t(`stage.${view}`)}{#if view === "blocks" && config}<span class="times">{` ×${config.n_layer}`}</span>{/if}</span
        >
        {#if view === "tokenize" && trace}
          <span class="preview chips" aria-hidden="true">
            {#each trace.positions as _, position (position)}<span style:--token-color={positionColor(position)}></span>{/each}
          </span>
        {:else if view === "blocks" && config}
          <span class="preview rings" aria-hidden="true">
            {#each { length: config.n_layer }, layer (layer)}<span></span>{/each}
          </span>
        {:else if view === "predict" && predictions.length}
          <span class="preview bars" aria-hidden="true" style:--token-color={positionColor(positionCount)}>
            {#each predictions as prediction (prediction.tokenId)}<span
                style:height="{(prediction.probability / predictions[0]!.probability) * 100}%"
              ></span>{/each}
          </span>
        {/if}
        <span class="spec">{spec(view)}</span>
      </button>
      {#if i < VIEWS.length - 1}
        <span class="tube" aria-hidden="true">
          {#each { length: positionCount }, position (position)}<span class="bead" style:--token-color={positionColor(position)}></span>{/each}
        </span>
      {/if}
    {/each}
    <span class="tube outlet" aria-hidden="true"></span>
  </div>
  <div class="return" aria-hidden="true">
    <span class="return-label">{t("pipeline.return")}</span>
  </div>
</nav>

<style>
  .apparatus {
    margin-top: 1.75rem;
  }
  .rig {
    display: flex;
    align-items: center;
  }
  .port {
    padding-right: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--ink-secondary);
  }
  .station {
    flex: none;
    display: grid;
    gap: 0.15rem;
    justify-items: start;
    min-width: 0;
    padding: 0.55rem 0.8rem;
    border: 1.5px solid var(--line);
    border-radius: 6px;
    background: linear-gradient(180deg, var(--glass), transparent 60%), var(--paper-raised);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / calc(0.6 - var(--glow) * 0.55));
    cursor: pointer;
    text-align: left;
  }
  /* Blocks grows with its content, so it can later open up in place to show one block's internals. */
  .station.blocks {
    flex: 0 1 auto;
  }
  .station[aria-current="step"] {
    border-width: 2.5px;
    box-shadow: 0 0 0 4px var(--line-soft);
  }
  .name {
    font-style: italic;
    font-size: 1.05rem;
  }
  .times,
  .spec {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-style: normal;
    color: var(--ink-secondary);
  }
  .preview {
    display: flex;
    gap: 2px;
    max-width: 7rem;
    overflow: hidden;
  }
  .chips span {
    flex: 0 1 6px;
    min-width: 2px;
    height: 9px;
    border-bottom: 2px solid var(--token-color);
    background: color-mix(in oklab, var(--token-color) 30%, transparent);
  }
  .bars {
    align-items: flex-end;
    height: 14px;
  }
  .bars span {
    width: 4px;
    min-height: 1px;
    background: var(--line);
    opacity: 0.55;
  }
  .bars span:first-child {
    background: var(--token-color);
    opacity: 1;
  }
  .rings span {
    width: 4px;
    height: 14px;
    border: 1px solid var(--line);
    border-radius: 2px;
  }
  .tube {
    flex: 1 1 0;
    min-width: 1.5rem;
    height: 14px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 2px;
    padding: 0 3px;
    overflow: hidden;
    border-top: 1.5px solid var(--line);
    border-bottom: 1.5px solid var(--line);
    background: var(--glass);
  }
  .tube.outlet {
    flex: 0 0 1.75rem;
    border-right: 1.5px solid var(--line);
    border-radius: 0 7px 7px 0;
  }
  .bead {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--token-color);
    box-shadow: 0 0 6px color-mix(in oklab, var(--token-color) calc(var(--glow) * 90%), transparent);
  }
  .return {
    position: relative;
    height: 1.6rem;
    margin: -1px 0.75rem 0 0.4rem;
    border: 1.5px solid var(--line-soft);
    border-top: none;
    border-radius: 0 0 12px 12px;
  }
  .return-label {
    position: absolute;
    left: 50%;
    bottom: -0.65rem;
    transform: translateX(-50%);
    padding: 0 0.5rem;
    background: var(--paper);
    font-size: 0.8rem;
    font-style: italic;
    color: var(--ink-secondary);
    white-space: nowrap;
  }

  /* On phones the stations shrink to their labels. */
  @media (max-width: 640px) {
    .station {
      flex: 0 1 auto;
      padding: 0.4rem 0.45rem;
    }
    .name {
      font-size: 0.85rem;
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    .spec,
    .preview,
    .times,
    .port {
      display: none;
    }
    .tube {
      min-width: 0.5rem;
    }
    .tube.outlet {
      flex-basis: 0.75rem;
    }
    .return-label {
      font-size: 0.75rem;
    }
  }
</style>
