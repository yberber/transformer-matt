<script lang="ts">
  // The KV cache as decoding holds it: every layer's keys (K) and values (V), one cell per
  // Position in its color, so the strips grow by a cell with each Step. A strip runs to the
  // Positions this run can reach, so the room left shows too. The text beside each strip
  // gives its size, so no strip stands alone.
  // The cells take their Position's color without its token text, which styles.css allows
  // only alongside token text. Here no cell's color carries meaning: what the strips show is
  // how many cells there are, and that count and the sizes are written out beside them.
  import type { ModelConfig } from "../estimates/config";
  import { kvCacheBytes } from "../estimates/kvCache";
  import { t, tPlural } from "../i18n/i18n";
  import { positionColor } from "../tokens/color";
  import { bytesText } from "./format";

  let { config, positions, capacity }: { config: ModelConfig; positions: number; capacity: number } = $props();

  const cache = $derived(kvCacheBytes(config, positions));
  const onePosition = $derived(kvCacheBytes(config, 1));
  const layerText = $derived(t("stats.kvLayerValue", { keys: bytesText(cache.keys), values: bytesText(cache.values) }));

  // One hard-edged band per Position, drawn once and shared by every strip.
  const positionCells = $derived(
    `linear-gradient(to right, ${Array.from({ length: positions }, (_, i) => {
      const from = (i / positions) * 100;
      const to = ((i + 1) / positions) * 100;
      return `${positionColor(i)} ${from}% ${to}%`;
    }).join(", ")})`,
  );
  const heldWidth = $derived(`${(Math.min(positions, capacity) / capacity) * 100}%`);
</script>

<dl class="figures">
  <div><dt>{t("stats.kvHeld")}</dt><dd>{tPlural("stats.positions", positions)}</dd></div>
  <div class="sum"><dt>{t("stats.kvAllLayers", { layers: cache.layers })}</dt><dd>{bytesText(cache.total)}</dd></div>
  <div><dt>{t("stats.kvPerPosition")}</dt><dd>{bytesText(onePosition.total)}</dd></div>
</dl>

<ol class="layers" aria-label={t("stats.kvLayersLabel")}>
  {#each { length: cache.layers }, layer (layer)}
    <li>
      <span class="name">{t("stats.layerN", { n: layer + 1 })}</span>
      <span class="strips" aria-hidden="true">
        {#each ["K", "V"] as part (part)}
          <span class="part">{part}</span>
          <span class="track"><span class="cells" style:width={heldWidth} style:--cells={positionCells} style:--n={positions}></span></span>
        {/each}
      </span>
      <span class="value">{layerText}</span>
    </li>
  {/each}
</ol>

<p class="note">{t("stats.kvStripNote", { capacity })}</p>

<style>
  .figures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.5rem 1.5rem;
    margin: 0.75rem 0 0;
    padding: 0.75rem 1rem;
    border-left: 2px solid var(--line);
    background: var(--glass);
  }
  dt {
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  dd {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }
  .sum dd {
    font-weight: 700;
  }
  .layers {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0 0.75rem;
    padding: 0;
    list-style: none;
  }
  .layers li {
    display: grid;
    grid-template-columns: minmax(5rem, auto) 1fr auto;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  .strips {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 0.4rem;
    min-width: 0;
  }
  .part {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    line-height: 1;
    color: var(--ink-secondary);
  }
  /* The room this run can reach, outlined; the Positions held fill it from the left. */
  .track {
    height: 8px;
    border: 1px dashed var(--line-soft);
    border-radius: 2px;
  }
  /* A 1px gap in the paper color between cells, over the Position colors. */
  .cells {
    display: block;
    height: 100%;
    background:
      repeating-linear-gradient(
        to right,
        transparent 0 calc(100% / var(--n) - 1px),
        var(--paper) calc(100% / var(--n) - 1px) calc(100% / var(--n))
      ),
      var(--cells);
  }
  .value {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
    white-space: nowrap;
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
    .strips {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
