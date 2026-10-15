<script lang="ts">
  // Embed: per Position, the token embedding plus the position embedding equals what
  // enters the first block, each vector drawn as a strip in the Position's color.
  // Wide screens put the three side by side; phones stack them, each labelled.
  import Message from "../i18n/Message.svelte";
  import { formatNumber, numberFormat, t, type MessageKey } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import { positionColor } from "../tokens/color";
  import { hex } from "../tokens/display";
  import TokenText from "../tokens/TokenText.svelte";
  import type { PositionRecord, Trace } from "../trace/decode";
  import EmbeddingStrip, { SATURATION } from "./EmbeddingStrip.svelte";
  import { addEmbeddings } from "./sum";

  let { trace }: { trace: Trace } = $props();

  const captionId = $props.id();

  // Six decimals keep every digit the 1e-6 check against Hugging Face can see.
  const exact = $derived(numberFormat({ minimumFractionDigits: 6, maximumFractionDigits: 6 }));

  const config = $derived(trace.header.config);
  const width = $derived(config.n_embd);
  const exactDimensions = $derived(trace.positions[0]!.tokenEmbedding.firstDimensions.length);

  // Each Position's three vectors, in reading order: token embedding + position embedding = sum.
  interface Vector {
    name: MessageKey;
    stripLabel: MessageKey;
    operator: "" | "+" | "=";
    values: Float32Array;
    firstDimensions: number[];
    /** Unknown for the sum: the Trace carries only its first dimensions exactly. */
    norm?: number;
  }
  function vectorsOf({ tokenEmbedding, positionEmbedding }: PositionRecord): Vector[] {
    return [
      { name: "embed.token", stripLabel: "embed.tokenStrip", operator: "", ...tokenEmbedding },
      { name: "embed.position", stripLabel: "embed.positionStrip", operator: "+", ...positionEmbedding },
      { name: "embed.sum", stripLabel: "embed.sumStrip", operator: "=", ...addEmbeddings(tokenEmbedding, positionEmbedding) },
    ];
  }
  const rows = $derived(trace.positions.map((position) => ({ ...position, vectors: vectorsOf(position) })));
</script>

{#snippet dimensions(values: number[])}
  <span class="dimensions">{#each values as value, i (i)}<span>{exact.format(value)}</span>{/each}</span>
{/snippet}

<ViewFrame view="embed">
  {#snippet lead()}<Message key="view.embed.lead" params={{ width }} />{/snippet}

  <p class="added">{t("embed.added")}</p>
  <div class="key">
    <p>{t("embed.legend", { width })}</p>
    <div class="scale" aria-hidden="true">
      <span class="ramp" style:--token-color={positionColor(0)}></span>
      <span class="ticks">
        <span>{t("embed.scaleLow", { value: formatNumber(-SATURATION) })}</span>
        <span>0</span>
        <span>{t("embed.scaleHigh", { value: formatNumber(SATURATION, { signDisplay: "always" }) })}</span>
      </span>
    </div>
  </div>

  <div class="columns" aria-hidden="true">
    <span></span><span>{t("embed.token")}</span><span></span><span>{t("embed.position")}</span><span></span><span
      >{t("embed.sum")}</span
    >
  </div>
  <ol class="rows" aria-label={t("embed.listLabel")}>
    {#each rows as row, i (i)}
      <li style:--token-color={positionColor(i)}>
        <span class="token"><span class="chip"><TokenText bytes={row.tokenBytes} plain /></span><span class="n">{i}</span></span>
        {#each row.vectors as vector (vector.name)}
          {#if vector.operator}<span class="op" aria-hidden="true">{vector.operator}</span>{/if}
          <span class="vector">
            <span class="label" aria-hidden="true">{vector.operator} {t(vector.name)}</span>
            <EmbeddingStrip values={vector.values} position={i} label={t(vector.stripLabel, { n: i })} />
          </span>
        {/each}
      </li>
    {/each}
  </ol>

  {#snippet details()}
    <!-- On narrow screens the table scrolls sideways; the region takes focus so arrow keys can scroll it. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby={captionId} tabindex="0">
      <table>
        <caption id={captionId}>{t("embed.truncated", { shown: exactDimensions, width })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("table.position")}</th>
            <th scope="col">{t("table.token")}</th>
            <th scope="col">{t("table.vector")}</th>
            <th scope="col">{t("table.norm")}</th>
            <th scope="col">{t("table.firstDimensions", { n: exactDimensions })}</th>
          </tr>
        </thead>
        {#each rows as row, i (i)}
          <tbody>
            {#each row.vectors as vector, v (vector.name)}
              <tr>
                {#if v === 0}
                  <th scope="rowgroup" rowspan={row.vectors.length}>{i}</th>
                  <td rowspan={row.vectors.length} class="token-cell" style:--token-color={positionColor(i)}>
                    <TokenText bytes={row.tokenBytes} />
                    <span class="token-meta">{t("table.tokenId")} {row.tokenId}</span>
                    <span class="token-meta">{t("table.bytes")} {hex(row.tokenBytes)}</span>
                  </td>
                {/if}
                <td class="vector-name">{t(vector.name)}</td>
                <td>{vector.norm === undefined ? "—" : exact.format(vector.norm)}</td>
                <td>{@render dimensions(vector.firstDimensions)}</td>
              </tr>
            {/each}
          </tbody>
        {/each}
      </table>
    </div>
    <p class="note">{t("embed.sumNote", { shown: exactDimensions, width })}</p>
    <p class="note">
      {t("embed.tables", { vocabulary: config.vocab_size, width, positions: config.n_positions })}
    </p>
  {/snippet}
</ViewFrame>

<style>
  .added {
    max-width: 40rem;
    margin: 1rem 0 0;
    padding-left: 0.9rem;
    border-left: 2px solid var(--line-soft);
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    margin: 1rem 0 1.25rem;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .key p {
    flex: 1 1 22rem;
    max-width: 40rem;
    margin: 0;
  }
  .scale {
    flex: 0 1 16rem;
    display: grid;
    gap: 0.2rem;
  }
  .ramp {
    height: 0.9rem;
    outline: 1px solid var(--rule);
    background: linear-gradient(90deg, var(--ink-secondary), transparent 50%, var(--token-color)), var(--paper);
  }
  .ticks {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .ticks :last-child {
    text-align: right;
  }
  /* Token, token embedding, +, position embedding, =, sum. */
  .columns,
  .rows li {
    display: grid;
    grid-template-columns: minmax(5rem, 8rem) 1fr 1rem 1fr 1rem 1fr;
    gap: 0.5rem;
    align-items: center;
  }
  .columns {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  .rows {
    display: grid;
    gap: 0.4rem;
    margin: 0.35rem 0 0;
    padding: 0;
    list-style: none;
  }
  .token {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    min-width: 0;
  }
  .token .chip {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85rem;
  }
  .n {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-secondary);
  }
  .op {
    font-family: var(--font-mono);
    text-align: center;
    color: var(--ink-secondary);
  }
  .label {
    display: none;
  }
  .table-scroll {
    overflow-x: auto;
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
    vertical-align: top;
  }
  th,
  td {
    padding: 0.25rem 0.5rem 0.25rem 0;
    border-bottom: 1px solid var(--rule);
  }
  td {
    vertical-align: top;
    white-space: nowrap;
  }
  tbody th[scope="rowgroup"] {
    font-family: var(--font-mono);
    font-weight: 400;
  }
  .token-cell {
    white-space: pre;
    box-shadow: inset 3px 0 0 var(--token-color);
    padding-left: 0.5rem;
  }
  .token-meta {
    display: block;
    max-width: 7rem;
    font-size: 0.75rem;
    color: var(--ink-secondary);
    white-space: normal;
  }
  .vector-name {
    min-width: 7rem;
    font-family: var(--font-prose);
    white-space: normal;
  }
  .dimensions {
    display: grid;
    grid-template-columns: repeat(8, auto);
    gap: 0 0.35rem;
    font-size: 0.8rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .note {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }

  /* On phones each Position stacks its token and three labelled strips. */
  @media (max-width: 640px) {
    .columns,
    .op {
      display: none;
    }
    .scale {
      flex-basis: 100%;
    }
    .rows {
      gap: 1rem;
    }
    .rows li {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }
    .label {
      display: block;
      font-size: 0.75rem;
      font-style: italic;
      color: var(--ink-secondary);
    }
  }
</style>
