<script lang="ts">
  // Attention: which tokens each token looks at, in one layer and head chosen with native
  // selects or [ and ]. Wide screens show the full heatmap; below 640 px a query-token
  // chooser with a ranked list takes its place. Both share one cursor cell: its row is the
  // query token whose exact weights the details list, and keyboard moves are announced in
  // a polite live region. Layer and head live in the URL, counted from 1.
  import { navigate, route } from "../app/route.svelte";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, formatPercent, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import { positionColor } from "../tokens/color";
  import { spokenToken } from "../tokens/spoken";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Trace } from "../trace/decode";
  import AttentionHeatmap from "./AttentionHeatmap.svelte";
  import AttentionRanked from "./AttentionRanked.svelte";
  import { clampCell, type Cell } from "./cell";

  let { trace }: { trace: Trace } = $props();

  // Three decimals tell apart every multiple of 1/255 the Trace can hold.
  const EXACT = { minimumFractionDigits: 3, maximumFractionDigits: 3 };

  const config = $derived(trace.header.config);
  const n = $derived(trace.positions.length);
  const rows = $derived(trace.positions.map((position) => position.attention[route.layer - 1]![route.head - 1]!));

  // Until the user picks a cell, the cursor follows the last Position as Steps are added.
  let picked = $state<Cell | null>(null);
  const cursor = $derived(clampCell(picked ?? { query: n - 1, key: 0 }, n));
  let announcement = $state("");

  // The share of attention the tokens after the first give the first token, on average.
  const sinkShare = $derived(n > 1 ? rows.slice(1).reduce((sum, row) => sum + row[0]!, 0) / (n - 1) : undefined);
  const exactRow = $derived(rows[cursor.query]!);

  function token(position: number): string {
    return spokenToken(trace.positions[position]!.tokenBytes);
  }

  function describe({ query, key }: Cell): string {
    return t("attention.cell", {
      query: token(query),
      from: query,
      key: token(key),
      to: key,
      weight: formatPercent(rows[query]![key]!),
    });
  }

  function move(cell: Cell) {
    picked = cell;
    announcement = describe(cell);
  }

  function choose(layer: number, head: number) {
    navigate({ layer, head }, { replace: true });
    announcement = `${t("attention.announceHead", { layer, head })} ${describe(cursor)}`;
  }

  // [ and ] step through the layer's heads, wrapping around, unless the user is typing.
  function onkeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]")) return;
    const delta = ({ "[": -1, "]": 1 } as Record<string, number>)[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    choose(route.layer, ((route.head - 1 + delta + config.n_head) % config.n_head) + 1);
  }
</script>

<svelte:window {onkeydown} />

<ViewFrame view="attention">
  {#snippet lead()}<Message key="view.attention.lead" params={{ heads: config.n_head }} />{/snippet}

  <div class="selectors">
    <label class="control">
      {t("attention.layer")}
      <select value={route.layer} onchange={(event) => choose(Number(event.currentTarget.value), route.head)}>
        {#each { length: config.n_layer }, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
      </select>
    </label>
    <label class="control">
      {t("attention.head")}
      <select value={route.head} onchange={(event) => choose(route.layer, Number(event.currentTarget.value))}>
        {#each { length: config.n_head }, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
      </select>
    </label>
    <span class="shortcut">{t("attention.shortcut")}</span>
  </div>

  <div class="wide">
    <AttentionHeatmap
      {trace}
      {rows}
      {cursor}
      {describe}
      label={t("attention.heatmapLabel", { layer: route.layer, head: route.head })}
      onmove={move}
      onfocus={() => (announcement = describe(cursor))}
    />
    <div class="key">
      <span>{t("attention.scale")}</span>
      <span class="tick">{formatNumber(0, { style: "percent" })}</span>
      <span class="ramp" aria-hidden="true"></span>
      <span class="tick">{formatNumber(1, { style: "percent" })}</span>
      <p>{t("attention.masked")}</p>
    </div>
  </div>
  <div class="narrow">
    <AttentionRanked {trace} {rows} query={cursor.query} onchoose={(query) => move(clampCell({ query, key: cursor.key }, n))} />
  </div>
  <p class="visually-hidden" role="status">{announcement}</p>

  <aside class="sink">
    <h3>{t("attention.sinkTitle")}</h3>
    <p>{t("attention.sink")}</p>
    {#if sinkShare !== undefined}
      <p class="share">{t("attention.sinkShare", { share: formatPercent(sinkShare) })}</p>
    {/if}
  </aside>

  {#snippet details()}
    <table>
      <caption>
        {t("attention.exactCaption", { query: token(cursor.query), n: cursor.query, layer: route.layer, head: route.head })}
      </caption>
      <thead>
        <tr>
          <th scope="col">{t("table.position")}</th>
          <th scope="col">{t("table.token")}</th>
          <th scope="col">{t("table.weight")}</th>
        </tr>
      </thead>
      <tbody>
        {#each exactRow as weight, key (key)}
          <tr class:current={key === cursor.key}>
            <td>{key}</td>
            <td class="token-cell" style:--token-color={positionColor(key)}><TokenText bytes={trace.positions[key]!.tokenBytes} /></td>
            <td>{formatNumber(weight, EXACT)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note">{t("attention.precision")}</p>
    <p class="note">
      {t("attention.heads", {
        heads: config.n_head,
        headWidth: config.n_embd / config.n_head,
        width: config.n_embd,
        layers: config.n_layer,
        total: config.n_layer * config.n_head,
      })}
    </p>
  {/snippet}
</ViewFrame>

<style>
  .selectors {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin: 1.25rem 0 1rem;
  }
  .selectors select {
    border: none;
    background: transparent;
    padding: 0 0.1rem;
    font-family: var(--font-mono);
  }
  /* The surrounding .control pill draws the focus ring. */
  .selectors select:focus-visible {
    outline: none;
  }
  .shortcut {
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .ramp {
    width: 8rem;
    height: 0.8rem;
    outline: 1px solid var(--rule);
    background: linear-gradient(90deg, var(--paper-raised), var(--line));
  }
  .tick {
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .key p {
    flex-basis: 100%;
    margin: 0;
  }
  .narrow {
    display: none;
  }
  .sink {
    max-width: 40rem;
    margin: 1.5rem 0 0;
    padding-left: 0.9rem;
    border-left: 2px solid var(--line-soft);
  }
  .sink h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .sink p {
    margin: 0.35rem 0 0;
  }
  .share {
    font-style: italic;
  }
  table {
    margin-top: 0.75rem;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  caption {
    max-width: 40rem;
    padding-bottom: 0.5rem;
    font-family: var(--font-prose);
    font-style: italic;
    text-align: left;
  }
  th {
    font-family: var(--font-prose);
    font-weight: 600;
    text-align: left;
  }
  th,
  td {
    padding: 0.2rem 1rem 0.2rem 0;
    border-bottom: 1px solid var(--rule);
  }
  td:last-child {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .current td {
    font-weight: 700;
  }
  .token-cell {
    white-space: pre;
    box-shadow: inset 3px 0 0 var(--token-color);
    padding-left: 0.5rem;
  }
  .note {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }

  /* Below 640 px the ranked list replaces the full heatmap. */
  @media (width < 640px) {
    .wide {
      display: none;
    }
    .narrow {
      display: block;
    }
  }
</style>
