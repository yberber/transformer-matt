<script lang="ts">
  // Next-token prediction at the last Position so far: the top 10 as a ranked list
  // with bars scaled to the top candidate, the share left to every other token, and
  // the top token waiting, in the next Position's color, to be appended.
  import Message from "../i18n/Message.svelte";
  import { formatNumber, formatPercent, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import { positionColor } from "../tokens/color";
  import { hex } from "../tokens/display";
  import TokenSequence from "../tokens/TokenSequence.svelte";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Trace } from "../trace/decode";

  // canAdvance: whether a next token can still be appended at this Step.
  let { trace, canAdvance }: { trace: Trace; canAdvance: boolean } = $props();

  // Six decimals keep every digit the 1e-4 check against Hugging Face can see.
  const EXACT = { minimumFractionDigits: 6, maximumFractionDigits: 6 };

  const vocabulary = $derived(trace.header.config.vocab_size);
  const predictions = $derived(trace.positions.at(-1)!.predictions);
  const top = $derived(predictions[0]!);
  const nextColor = $derived(positionColor(trace.positions.length));
  const topTenShare = $derived(predictions.reduce((sum, p) => sum + p.probability, 0));
</script>

<ViewFrame view="predict">
  {#snippet lead()}<Message key="view.predict.lead" params={{ vocabulary }} />{/snippet}

  <TokenSequence {trace} label={t("predict.sequenceLabel")}>
    {#snippet after()}
      {#if canAdvance}
        <span class="next" style:--token-color={nextColor}>
          <span class="chip ghost"><TokenText bytes={top.tokenBytes} plain /></span>
          <span class="caption">{t("predict.next")}</span>
        </span>
      {/if}
    {/snippet}
  </TokenSequence>

  <ol class="ranked" aria-label={t("predict.rankedLabel")} style:--token-color={nextColor}>
    {#each predictions as prediction, i (prediction.tokenId)}
      <li class:winner={i === 0}>
        <span class="rank">{i + 1}</span>
        <span class="candidate"><TokenText bytes={prediction.tokenBytes} /></span>
        <span class="bar" aria-hidden="true"><span style:width="{(prediction.probability / top.probability) * 100}%"></span></span>
        <span class="p">{formatPercent(prediction.probability)}</span>
      </li>
    {/each}
  </ol>
  <p class="rest">
    <span>{t("predict.rest", { n: vocabulary - predictions.length })}</span>
    <span class="p">{formatPercent(1 - topTenShare)}</span>
  </p>
  <p class="note">{t("predict.scale")}</p>
  <p class="greedy">{t("predict.greedy")}</p>

  {#snippet details()}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">{t("table.rank")}</th>
            <th scope="col">{t("table.token")}</th>
            <th scope="col">{t("table.tokenId")}</th>
            <th scope="col">{t("table.bytes")}</th>
            <th scope="col">{t("table.probability")}</th>
          </tr>
        </thead>
        <tbody>
          {#each predictions as prediction, i (prediction.tokenId)}
            <tr>
              <td>{i + 1}</td>
              <td class="token-cell"><TokenText bytes={prediction.tokenBytes} /></td>
              <td>{prediction.tokenId}</td>
              <td>{hex(prediction.tokenBytes)}</td>
              <td>{formatNumber(prediction.probability, EXACT)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      {t("predict.detailsNote", { vocabulary, sum: formatNumber(topTenShare, EXACT) })}
    </p>
  {/snippet}
</ViewFrame>

<style>
  .next {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .ghost {
    border-bottom-style: dashed;
    background: transparent;
    box-shadow: none;
  }
  .caption {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--ink-secondary);
  }
  .ranked {
    display: grid;
    gap: 0.25rem;
    max-width: 36rem;
    margin: 1rem 0 0.25rem;
    padding: 0;
    list-style: none;
  }
  .ranked li,
  .rest {
    display: grid;
    grid-template-columns: 2ch minmax(5rem, 9rem) 1fr 4.5rem;
    gap: 0.75rem;
    align-items: center;
  }
  .rank,
  .p {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink-secondary);
    text-align: right;
  }
  .candidate {
    font-family: var(--font-mono);
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .winner .candidate,
  .winner .p {
    color: var(--ink);
    font-weight: 600;
  }
  .bar {
    height: 6px;
    border-bottom: 1px solid var(--rule);
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--line);
    opacity: 0.55;
  }
  .winner .bar span {
    background: var(--token-color);
    opacity: 1;
    box-shadow: 0 0 8px color-mix(in oklab, var(--token-color) calc(var(--glow) * 80%), transparent);
  }
  .rest {
    max-width: 36rem;
    margin: 0.35rem 0 0;
    padding-top: 0.35rem;
    border-top: 1px dashed var(--line-soft);
    font-size: 0.9rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  /* The share of every other token spans the rank, token and bar columns. */
  .rest span:first-child {
    grid-column: 1 / 4;
  }
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .greedy {
    max-width: 40rem;
    margin: 1rem 0 0;
    padding-left: 0.9rem;
    border-left: 2px solid var(--line-soft);
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    margin-top: 0.75rem;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }
  th {
    font-family: var(--font-prose);
    font-weight: 600;
    text-align: left;
  }
  th,
  td {
    padding: 0.25rem 0.75rem 0.25rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .token-cell {
    white-space: pre;
  }
</style>
