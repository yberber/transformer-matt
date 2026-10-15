<script lang="ts">
  // The fused QKV weight drawn to scale as one matrix: a row per input number, and its
  // columns split into Q, K and V, each into heads of headWidth columns. Decorative: the
  // caption says the same in words.
  import { formatNumber, t } from "../i18n/i18n";

  let { rows, heads, headWidth }: { rows: number; heads: number; headWidth: number } = $props();

  const LABELS = ["Q", "K", "V"];
  const parts = LABELS.length;
  const partWidth = $derived(heads * headWidth);
</script>

<figure class="qkv">
  <div class="matrix" aria-hidden="true">
    <span class="labels" style:--parts={parts}>
      {#each LABELS as label (label)}
        <span><b>{label}</b> {formatNumber(heads)} × {formatNumber(headWidth)}</span>
      {/each}
    </span>
    <svg viewBox="0 0 {parts * partWidth} {rows}" preserveAspectRatio="none" style:aspect-ratio="{parts * partWidth} / {rows}">
      {#each { length: parts }, p (p)}
        <rect x={p * partWidth} y="0" width={partWidth} height={rows} />
        {#each { length: heads - 1 }, h (h)}
          <line class="head" x1={p * partWidth + (h + 1) * headWidth} x2={p * partWidth + (h + 1) * headWidth} y1="0" y2={rows} />
        {/each}
      {/each}
    </svg>
  </div>
  <figcaption>{t("arch.qkv", { rows, columns: parts * partWidth, heads, headWidth })}</figcaption>
</figure>

<style>
  .qkv {
    flex-basis: 100%;
    margin: 0.25rem 0 0.4rem;
  }
  .matrix {
    max-width: 30rem;
  }
  .labels {
    display: grid;
    grid-template-columns: repeat(var(--parts), 1fr);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-secondary);
    text-align: center;
  }
  .labels b {
    color: var(--ink);
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  rect {
    fill: var(--glass);
    stroke: var(--line);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .head {
    stroke: var(--line-soft);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  figcaption {
    max-width: 30rem;
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
</style>
