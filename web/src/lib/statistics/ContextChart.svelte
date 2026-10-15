<script lang="ts">
  // What one token costs at every context length from 1 to n_positions, on a log axis, in two
  // panels that share it: the FLOPs stacked as everything else (the same at every length), the
  // attention scores and the weighted sum; and below, attention's share of them, where its
  // growth shows. A marker stands at this text's length. Pointer and keyboard read any length
  // below the plot; the caption says what it shows and the details hold the exact numbers.
  import type { ModelConfig } from "../estimates/config";
  import { formatNumber, t, tPlural } from "../i18n/i18n";
  import { COMPONENT_COLOR } from "./colors";
  import { contextCosts, lengthScale, lengthTicks, roundTicks, type ContextCost } from "./contextChart";
  import { flopsText, shareText } from "./format";

  let { config, positions }: { config: ModelConfig; positions: number } = $props();

  // Stacked from the baseline up: the fixed part, then attention's two growing parts.
  const BANDS = ["rest", "scores", "weightedSum"] as const;
  type Band = (typeof BANDS)[number];
  const BAND_COLOR: Record<Band, string | undefined> = { rest: undefined, ...COMPONENT_COLOR };
  const label = (band: Band) => (band === "rest" ? t("stats.contextRest") : t(`stats.part.${band}`));

  interface Panel {
    top: number;
    height: number;
    bands: readonly Band[];
    /** A band's height at a length, in the panel's unit. */
    size: (cost: ContextCost, band: Band) => number;
    ticks: number[];
    tickText: (value: number) => string;
  }

  // The share panel's title sits in the gap above it.
  const COST_PANEL = { top: 28, height: 160 };
  const SHARE_PANEL = { top: 226, height: 90 };
  const HEIGHT = SHARE_PANEL.top + SHARE_PANEL.height + 26;
  const RIGHT = 22;
  // Tick labels are 11px monospace: about 6.7px a character.
  const CHARACTER = 6.7;

  const costs = $derived(contextCosts(config));
  const max = $derived(config.n_positions);
  const longest = $derived(costs.at(-1)!);
  let width = $state(0);
  let svg = $state<SVGSVGElement>();
  // The length read by pointer or keyboard; this text's length when neither is reading.
  let reading = $state<number | null>(null);
  const shown = $derived(reading ?? positions);
  const costAt = (length: number) => costs[Math.min(length, max) - 1]!;
  const shownCost = $derived(costAt(shown));
  const here = $derived(costAt(positions));

  const panels: Panel[] = $derived([
    {
      ...COST_PANEL,
      bands: BANDS,
      size: (cost, band) => cost[band],
      ticks: roundTicks(longest.total, 3),
      tickText: (flops) => formatNumber(flops, { notation: "compact", compactDisplay: "short" }),
    },
    {
      ...SHARE_PANEL,
      bands: ["scores", "weightedSum"],
      size: (cost, band) => cost[band] / cost.total,
      ticks: roundTicks((longest.scores + longest.weightedSum) / longest.total, 3),
      tickText: (share) => formatNumber(share, { style: "percent" }),
    },
  ]);

  // Wide enough for the longest tick label in the reader's language ("300 Mio.").
  const left = $derived(10 + CHARACTER * Math.max(...panels.flatMap((p) => p.ticks.map((v) => p.tickText(v).length))));
  const x = $derived(lengthScale(max, [left, width - RIGHT]));
  // Every other doubling once each would have under 36 pixels.
  const xTicks = $derived(lengthTicks(max, (width - left - RIGHT) / Math.log2(max) < 36 ? 2 : 1));

  function y(panel: Panel, value: number): number {
    return panel.top + panel.height - (value / panel.ticks.at(-1)!) * panel.height;
  }

  /** Where a band's top edge is: the sum of it and every band beneath it in its panel. */
  function stackTop(panel: Panel, cost: ContextCost, band: Band | undefined): number {
    if (!band) return 0;
    return panel.bands.slice(0, panel.bands.indexOf(band) + 1).reduce((sum, b) => sum + panel.size(cost, b), 0);
  }

  // The lengths to draw through: on a log axis most of them crowd the right edge, so keep one per pixel.
  const drawn = $derived.by(() => {
    const kept: ContextCost[] = [];
    let lastX = -Infinity;
    for (const cost of costs) {
      if (x.at(cost.length) - lastX >= 1 || cost.length === max) {
        kept.push(cost);
        lastX = x.at(cost.length);
      }
    }
    return kept;
  });

  function area(panel: Panel, band: Band): string {
    const below = panel.bands[panel.bands.indexOf(band) - 1];
    const edge = (on: Band | undefined) => drawn.map((c) => `${x.at(c.length).toFixed(1)},${y(panel, stackTop(panel, c, on)).toFixed(1)}`);
    return `M${edge(band).join("L")}L${edge(below).reverse().join("L")}Z`;
  }

  function onpointermove(event: PointerEvent) {
    reading = x.lengthAt(event.clientX - svg!.getBoundingClientRect().left);
  }

  function onpointerleave() {
    // A keyboard reading stays while the chart has focus.
    if (document.activeElement !== svg) reading = null;
  }

  function onkeydown(event: KeyboardEvent) {
    const to = {
      ArrowLeft: shown - 1,
      ArrowDown: shown - 1,
      ArrowRight: shown + 1,
      ArrowUp: shown + 1,
      PageDown: Math.floor(shown / 2),
      PageUp: shown * 2,
      Home: 1,
      End: max,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    reading = Math.min(max, Math.max(1, to));
  }

  const readout = $derived(
    t("stats.contextReadout", { positions: tPlural("stats.positions", shown), total: flopsText(shownCost.total) }),
  );
  const markerX = $derived(x.at(Math.min(positions, max)));
  // Keep the marker's label, about 100px wide, inside the plot near either edge.
  const anchor = $derived(markerX < left + 50 ? "start" : markerX > width - RIGHT - 50 ? "end" : "middle");
</script>

<figure>
  <ul class="legend" aria-label={t("stats.contextLegend")}>
    {#each [...BANDS].reverse() as band (band)}
      <li><span class="swatch {band}" style:--color={BAND_COLOR[band]} aria-hidden="true"></span>{label(band)}</li>
    {/each}
  </ul>

  <p class="axis-title" aria-hidden="true">{t("stats.contextYAxis")}</p>
  <div class="plot" bind:clientWidth={width}>
    {#if width > 0}
      <svg
        bind:this={svg}
        {width}
        height={HEIGHT}
        role="slider"
        tabindex="0"
        aria-label={t("stats.contextSlider")}
        aria-valuemin={1}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={readout}
        {onpointermove}
        {onpointerleave}
        {onkeydown}
        onblur={() => (reading = null)}
      >
        <text class="panel-title" x={left} y={SHARE_PANEL.top - 12}>{t("stats.contextShareAxis")}</text>
        {#each panels as panel, i (i)}
          {#each panel.ticks as tick (tick)}
            <line class="grid" x1={left} x2={width - RIGHT} y1={y(panel, tick)} y2={y(panel, tick)} />
            <text class="tick" x={left - 6} y={y(panel, tick)} text-anchor="end" dominant-baseline="middle">{panel.tickText(tick)}</text>
          {/each}
          {#each panel.bands as band (band)}
            <path class="band {band}" d={area(panel, band)} style:--color={BAND_COLOR[band]} />
          {/each}
          <line class="baseline" x1={left} x2={width - RIGHT} y1={y(panel, 0)} y2={y(panel, 0)} />
          {#if reading !== null}
            <line class="crosshair" x1={x.at(reading)} x2={x.at(reading)} y1={panel.top} y2={y(panel, 0)} />
          {/if}
          <line class="marker" x1={markerX} x2={markerX} y1={panel.top - (i === 0 ? 4 : 0)} y2={y(panel, 0)} />
          <circle class="dot" cx={markerX} cy={y(panel, stackTop(panel, here, panel.bands.at(-1)))} r="4" />
        {/each}
        {#each xTicks as tick (tick)}
          <text class="tick" x={x.at(tick)} y={HEIGHT - 10} text-anchor="middle">{formatNumber(tick)}</text>
        {/each}
        <text class="marker-label" data-testid="context-marker" x={markerX} y={COST_PANEL.top - 10} text-anchor={anchor}
          >{t("stats.contextMarker", { n: positions })}</text
        >
      </svg>
    {/if}
  </div>
  <p class="axis-title x" aria-hidden="true">{t("stats.contextXAxis")}</p>

  <div class="readout" data-testid="context-readout">
    <p>{readout}</p>
    <ul>
      {#each [...BANDS].reverse() as band (band)}
        <li>
          <span class="key {band}" style:--color={BAND_COLOR[band]} aria-hidden="true"></span>
          <span class="value">{flopsText(shownCost[band])} · {shareText(shownCost[band], shownCost.total)}</span>
          <span>{label(band)}</span>
        </li>
      {/each}
    </ul>
  </div>

  <figcaption>
    {t("stats.contextSummary", {
      max,
      rest: flopsText(longest.rest),
      first: shareText(costs[0]!.scores, costs[0]!.total),
      last: shareText(longest.scores, longest.total),
    })}
    {t("stats.contextHere", { positions: tPlural("stats.positions", positions), share: shareText(here.scores, here.total) })}
  </figcaption>
</figure>

<style>
  figure {
    --rest-fill: color-mix(in oklab, var(--line) 14%, transparent);
    margin: 0;
  }
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
  .swatch.rest {
    background: var(--rest-fill);
    box-shadow: inset 0 0 0 1px var(--line-soft);
  }
  .axis-title {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .axis-title.x {
    text-align: right;
  }
  .plot {
    width: 100%;
    min-width: 0;
    touch-action: pan-y;
  }
  svg {
    display: block;
    overflow: visible;
    cursor: crosshair;
  }
  svg:focus-visible {
    outline: 2px solid var(--line);
    outline-offset: 2px;
  }
  .panel-title {
    font-family: var(--font-prose);
    font-size: 12.8px;
    fill: var(--ink-secondary);
  }
  .grid {
    stroke: var(--rule);
    stroke-width: 1;
  }
  .baseline {
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .tick {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--ink-secondary);
  }
  .band {
    fill: var(--color);
  }
  .band.rest {
    fill: var(--rest-fill);
  }
  .crosshair {
    stroke: var(--ink-faint);
    stroke-width: 1;
  }
  .marker {
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .dot {
    fill: var(--ink);
    stroke: var(--paper);
    stroke-width: 2;
  }
  .marker-label {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--ink);
  }
  .readout {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-left: 2px solid var(--line);
    background: var(--glass);
    font-size: 0.85rem;
  }
  .readout p {
    margin: 0 0 0.25rem;
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .readout ul {
    display: grid;
    gap: 0.15rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .readout li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 0.5rem;
  }
  .readout .value {
    font-family: var(--font-mono);
  }
  /* Line keys in the readout, as in a tooltip. */
  .key {
    width: 0.9rem;
    height: 2px;
    background: var(--color);
  }
  .key.rest {
    background: var(--line-soft);
  }
  figcaption {
    max-width: 40rem;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
</style>
