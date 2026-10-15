<script lang="ts">
  // One layer's FLOPs as a stacked bar by component, drawn once with ×n_layer because every
  // layer does the same arithmetic. A toggle draws all of them, to the same scale, so their
  // equal cost shows. The legend names each segment with its value, so no color stands alone.
  import { BLOCK_COMPONENTS, type Flops } from "../estimates/flops";
  import { t } from "../i18n/i18n";
  import { COMPONENT_COLOR } from "./colors";
  import { flopsText, shareText } from "./format";

  let { flops }: { flops: Flops } = $props();

  let showAll = $state(false);
  const id = $props.id();
  const rows = $derived(showAll ? flops.layers : 1);
</script>

<ul class="legend" aria-label={t("stats.legend")}>
  {#each BLOCK_COMPONENTS as part (part)}
    <li>
      <span class="swatch" style:--color={COMPONENT_COLOR[part]} aria-hidden="true"></span>
      <span>{t(`stats.part.${part}`)}</span>
      <span class="value">{flopsText(flops.perLayer[part])} · {shareText(flops.perLayer[part], flops.layer)}</span>
    </li>
  {/each}
</ul>

<button type="button" class="control" aria-expanded={showAll} aria-controls={id} onclick={() => (showAll = !showAll)}>
  {t("stats.allLayers", { layers: flops.layers })}
</button>

<ol class="layers" {id} aria-label={t("stats.layersLabel")}>
  {#each { length: rows }, layer (layer)}
    <li>
      <span class="name">{showAll ? t("stats.layerN", { n: layer + 1 }) : t("stats.eachLayer")}</span>
      <span class="bar" aria-hidden="true">
        {#each BLOCK_COMPONENTS as part (part)}
          <span
            style:--color={COMPONENT_COLOR[part]}
            style:flex-basis="{(flops.perLayer[part] / flops.layer) * 100}%"
            title="{t(`stats.part.${part}`)}: {flopsText(flops.perLayer[part])}"
          ></span>
        {/each}
      </span>
      <span class="value"
        >{flopsText(flops.layer)}{#if !showAll}<span class="times">{` ×${flops.layers}`}</span>{/if}</span
      >
    </li>
  {/each}
</ol>

<p class="note">
  {t("stats.layersSame", { layers: flops.layers, layer: flopsText(flops.layer), total: flopsText(flops.layer * flops.layers) })}
</p>

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.25rem;
    margin: 0.5rem 0 0.75rem;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .swatch {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 2px;
    background: var(--color);
  }
  .value {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
    white-space: nowrap;
  }
  .control[aria-expanded="true"] {
    border-color: var(--line);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .layers {
    display: grid;
    gap: 0.35rem;
    margin: 0.75rem 0;
    padding: 0;
    list-style: none;
  }
  .layers li {
    display: grid;
    grid-template-columns: minmax(6rem, auto) 1fr auto;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  /* Segments separated by a 2px gap in the surface color; the data end is rounded. */
  .bar {
    display: flex;
    gap: 2px;
    height: 18px;
    min-width: 0;
  }
  .bar span {
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 0;
    background: var(--color);
  }
  .bar span:last-child {
    border-radius: 0 4px 4px 0;
  }
  .times {
    color: var(--line);
    font-weight: 700;
  }
  .note {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  @media (max-width: 30rem) {
    .layers li {
      grid-template-columns: 1fr auto;
    }
    .bar {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
