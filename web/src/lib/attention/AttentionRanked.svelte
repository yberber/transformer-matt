<script lang="ts">
  // Attention for narrow screens: choose the token looking back, then read where it
  // looks as a ranked list, bars scaled to its largest weight. A small overview of the
  // whole heatmap stays beside the list, with the chosen row marked.
  import { formatPercent, t } from "../i18n/i18n";
  import { positionColor } from "../tokens/color";
  import { spokenToken } from "../tokens/spoken";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Trace } from "../trace/decode";
  import HeatmapCanvas from "./HeatmapCanvas.svelte";

  let {
    trace,
    rows,
    query,
    onchoose,
  }: { trace: Trace; rows: Float32Array[]; query: number; onchoose: (query: number) => void } = $props();

  const SHOWN = 10;

  const n = $derived(rows.length);
  const ranked = $derived(
    Array.from(rows[query]!, (weight, key) => ({ key, weight }))
      .sort((a, b) => b.weight - a.weight || a.key - b.key)
  );
  const top = $derived(ranked.slice(0, SHOWN));
  const rest = $derived(ranked.slice(SHOWN));
  // A row always has weight somewhere; the fallback only avoids dividing by 0.
  const largest = $derived(top[0]!.weight || 1);
  const queryText = $derived(spokenToken(trace.positions[query]!.tokenBytes));
</script>

<label class="control chooser">
  {t("attention.query")}
  <select value={query} onchange={(event) => onchoose(Number(event.currentTarget.value))}>
    {#each trace.positions as position, i (i)}
      <option value={i}>{t("attention.queryOption", { n: i, token: spokenToken(position.tokenBytes) })}</option>
    {/each}
  </select>
</label>

<div class="layout">
  <div class="overview" role="img" aria-label={t("attention.overview", { n: query })} style:--n={n}>
    <HeatmapCanvas {rows} />
    <span class="row" style:--row={query}></span>
  </div>
  <div class="list">
    <ol class="ranked" aria-label={t("attention.rankedLabel", { query: queryText, n: query })}>
      {#each top as { key, weight } (key)}
        <li style:--token-color={positionColor(key)}>
          <span class="token"><span class="chip"><TokenText bytes={trace.positions[key]!.tokenBytes} plain /></span><span
              class="n">{key}</span
            ></span>
          <span class="bar" aria-hidden="true"><span style:width="{(weight / largest) * 100}%"></span></span>
          <span class="p">{formatPercent(weight)}</span>
        </li>
      {/each}
    </ol>
    {#if rest.length}
      <p class="rest">
        <span>{t("attention.rest", { n: rest.length })}</span>
        <span class="p">{formatPercent(rest.reduce((sum, { weight }) => sum + weight, 0))}</span>
      </p>
    {/if}
  </div>
</div>

<style>
  .chooser select {
    max-width: 14rem;
    border: none;
    background: transparent;
    padding: 0 0.1rem;
  }
  /* The surrounding .control pill draws the focus ring. */
  .chooser select:focus-visible {
    outline: none;
  }
  .layout {
    display: grid;
    grid-template-columns: 5.5rem 1fr;
    gap: 1rem;
    align-items: start;
    margin-top: 1rem;
  }
  .overview {
    position: relative;
    outline: 1px solid var(--rule);
  }
  .row {
    position: absolute;
    left: -3px;
    right: -3px;
    top: calc(var(--row) / var(--n) * 100%);
    height: max(2px, calc(100% / var(--n)));
    outline: 1.5px solid var(--ink);
  }
  .ranked {
    display: grid;
    gap: 0.3rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ranked li,
  .rest {
    display: grid;
    grid-template-columns: minmax(0, 7rem) 1fr 3.5rem;
    gap: 0.5rem;
    align-items: center;
  }
  .token {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    min-width: 0;
  }
  .token .chip {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85rem;
  }
  .n,
  .p {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-secondary);
  }
  .p {
    text-align: right;
  }
  .bar {
    height: 6px;
    border-bottom: 1px solid var(--rule);
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--token-color);
  }
  .rest {
    margin: 0.35rem 0 0;
    padding-top: 0.35rem;
    border-top: 1px dashed var(--line-soft);
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  .rest span:first-child {
    grid-column: 1 / 3;
  }
</style>
