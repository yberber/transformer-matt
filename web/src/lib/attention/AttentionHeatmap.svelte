<script lang="ts">
  // The full heatmap of one head, for wide screens: rows labelled with the tokens looking
  // back, columns with the tokens looked at, each in its Position's color. The plot is
  // one tab stop; arrow keys, Home and End move the cursor cell, which the view announces,
  // as it does where the cursor is when the plot takes focus.
  // Pointing at a cell shows its weight below the plot; clicking moves the cursor there.
  import { t } from "../i18n/i18n";
  import { positionColor } from "../tokens/color";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Trace } from "../trace/decode";
  import { moveCell, type Cell } from "./cell";
  import HeatmapCanvas from "./HeatmapCanvas.svelte";

  let {
    trace,
    rows,
    cursor,
    label,
    describe,
    onmove,
    onfocus,
  }: {
    trace: Trace;
    rows: Float32Array[];
    cursor: Cell;
    label: string;
    /** The cell in words, as the view announces it. */
    describe: (cell: Cell) => string;
    onmove: (cell: Cell) => void;
    /** The plot took focus, so the view can announce where the cursor is. */
    onfocus: () => void;
  } = $props();

  const hintId = $props.id();
  let plot: HTMLDivElement;
  let hovered = $state<Cell | null>(null);

  const n = $derived(rows.length);
  // The cell the readout below the plot describes: the one pointed at, else the cursor.
  const readoutCell = $derived(hovered && hovered.query < n ? hovered : cursor);

  function onkeydown(event: KeyboardEvent) {
    const target = moveCell(cursor, event.key, n);
    if (!target) return;
    event.preventDefault();
    onmove(target);
  }

  function cellAt(event: PointerEvent | MouseEvent): Cell | null {
    const rect = plot.getBoundingClientRect();
    const query = Math.floor(((event.clientY - rect.top) / rect.height) * n);
    const key = Math.floor(((event.clientX - rect.left) / rect.width) * n);
    return query >= 0 && query < n && key >= 0 && key <= query ? { query, key } : null;
  }

  function onclick(event: MouseEvent) {
    const cell = cellAt(event);
    if (cell) onmove(cell);
  }

  // Keep the cursor in sight when the plot scrolls sideways on narrower screens.
  let cursorMarker = $state<HTMLSpanElement>();
  $effect(() => {
    void cursor;
    if (document.activeElement === plot) cursorMarker?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
</script>

<div class="scroll">
  <div class="heatmap" style:--n={n}>
    <span class="axis" aria-hidden="true">{t("attention.rows")} ↓ · {t("attention.columns")} →</span>
    <div class="keys" aria-hidden="true" data-testid="key-labels">
      {#each trace.positions as position, j (j)}
        <span class="key" class:active={readoutCell.key === j} style:--token-color={positionColor(j)}>
          <span class="text"><TokenText bytes={position.tokenBytes} plain /></span>
        </span>
      {/each}
    </div>
    <div class="queries" aria-hidden="true" data-testid="query-labels">
      {#each trace.positions as position, i (i)}
        <span class="query" class:active={readoutCell.query === i} style:--token-color={positionColor(i)}>
          <span class="n">{i}</span>
          <span class="text"><TokenText bytes={position.tokenBytes} plain /></span>
        </span>
      {/each}
    </div>
    <!-- An application, so screen readers pass the arrow keys through; it is the one focusable widget. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="plot"
      role="application"
      tabindex="0"
      aria-label={label}
      aria-describedby={hintId}
      bind:this={plot}
      {onkeydown}
      {onclick}
      {onfocus}
      onpointermove={(event) => (hovered = cellAt(event))}
      onpointerleave={() => (hovered = null)}
    >
      <HeatmapCanvas {rows} />
      <span class="marker cursor" bind:this={cursorMarker} style:--row={cursor.query} style:--col={cursor.key}></span>
      {#if hovered}<span class="marker hover" style:--row={hovered.query} style:--col={hovered.key}></span>{/if}
    </div>
  </div>
</div>
<p class="readout">{describe(readoutCell)}</p>
<p class="hint" id={hintId}>{t("attention.hint")}</p>

<style>
  .scroll {
    overflow-x: auto;
    padding: 0.25rem 0.25rem 0.5rem;
  }
  /* Row labels, then the plot; the column labels sit above the plot. Cells are at least
     0.85rem, so the labels stay readable; the plot scrolls sideways if that does not fit. */
  .heatmap {
    display: grid;
    grid-template-columns: max-content minmax(calc(var(--n) * 0.85rem), calc(var(--n) * 2.25rem));
    grid-template-rows: auto auto;
    column-gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    line-height: 1;
  }
  .axis {
    align-self: end;
    padding-bottom: 0.3rem;
    font-family: var(--font-prose);
    font-style: italic;
    font-size: 0.75rem;
    color: var(--ink-secondary);
  }
  .keys {
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    align-items: end;
    padding-bottom: 0.2rem;
  }
  .key {
    display: flex;
    justify-content: center;
    border-bottom: 3px solid var(--token-color);
    min-width: 0;
  }
  /* Column labels read bottom to top. */
  .key .text {
    max-height: 6rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    padding: 0.15rem 0;
  }
  .queries {
    display: grid;
    grid-template-rows: repeat(var(--n), 1fr);
  }
  .query {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
    min-height: 0;
    max-width: 10rem;
  }
  .query .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    padding: 0 0.25rem;
    border-right: 3px solid var(--token-color);
    background: color-mix(in oklab, var(--token-color) 14%, var(--paper));
  }
  .n {
    color: var(--ink-secondary);
  }
  .active .text {
    font-weight: 700;
    color: var(--ink);
    background: color-mix(in oklab, var(--token-color) 30%, var(--paper));
  }
  .plot {
    position: relative;
    align-self: start;
    outline: 1px solid var(--rule);
    cursor: crosshair;
  }
  .plot:focus-visible {
    outline: 2px solid var(--line);
    outline-offset: 3px;
  }
  .marker {
    position: absolute;
    left: calc(var(--col) / var(--n) * 100%);
    top: calc(var(--row) / var(--n) * 100%);
    width: calc(100% / var(--n));
    height: calc(100% / var(--n));
    pointer-events: none;
  }
  .cursor {
    outline: 1.5px dashed var(--ink-secondary);
  }
  .plot:focus-visible .cursor {
    outline: 2px solid var(--ink);
    box-shadow: 0 0 0 2px var(--paper);
  }
  .hover {
    outline: 1.5px solid var(--ink);
  }
  .readout {
    min-height: 1.5em;
    margin: 0.5rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }
  .hint {
    max-width: 40rem;
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
</style>
