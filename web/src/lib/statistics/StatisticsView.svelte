<script lang="ts">
  // What GPT-2 computes for the text at the current Step, as theoretical Estimates from the
  // Estimates module: FLOPs per token for prefill and decode, totals for the text so far and
  // its KV cache, a breakdown by component, and one layer's cost drawn ×n_layer.
  import { GPT2_CONFIG } from "../estimates/config";
  import { COMPONENTS, decodeFlops, textFlops, type Component } from "../estimates/flops";
  import { kvCacheBytes } from "../estimates/kvCache";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import type { Trace } from "../trace/decode";
  import { COMPONENT_COLOR } from "./colors";
  import ContextChart from "./ContextChart.svelte";
  import { contextCost, exactLengths } from "./contextChart";
  import EstimateLink from "./EstimateLink.svelte";
  import { bytesText, flopsText, shareText } from "./format";
  import LayerBars from "./LayerBars.svelte";

  let { trace }: { trace: Trace } = $props();

  // Only the blocks' components are drawn in color; the embeddings and the LM head have none.
  const colors: Partial<Record<Component, string>> = COMPONENT_COLOR;

  const promptLength = $derived(trace.promptLength);
  const positions = $derived(trace.positions.length);
  const steps = $derived(positions - promptLength);

  const cost = $derived(textFlops(GPT2_CONFIG, promptLength, steps));
  // Prefill reads the whole Prompt in one go; per token is its average.
  const perPromptToken = $derived(cost.prefill.total / promptLength);
  // The next Step decodes one more token, reading every Position so far and itself.
  const next = $derived(decodeFlops(GPT2_CONFIG, positions + 1));
  const cache = $derived(kvCacheBytes(GPT2_CONFIG, positions));

  // The context-length chart's exact numbers.
  const contextRows = $derived(
    exactLengths(GPT2_CONFIG.n_positions, positions).map((length) => contextCost(GPT2_CONFIG, length)),
  );
</script>

<ViewFrame view="statistics" atStep>
  {#snippet lead()}<Message key="view.statistics.lead" />{/snippet}

  <section class="part" aria-labelledby="stats-per-token">
    <h3 id="stats-per-token">{t("stats.perToken")}</h3>
    <div class="figures">
      <div class="figure" role="group" aria-labelledby="stats-prefill">
        <h4 id="stats-prefill">{t("stats.prefill")}</h4>
        <p class="big">{flopsText(perPromptToken)}</p>
        <p>{t("stats.prefillNote", { n: promptLength, total: flopsText(cost.prefill.total) })}</p>
        <EstimateLink />
      </div>
      <div class="figure" role="group" aria-labelledby="stats-decode">
        <h4 id="stats-decode">{t("stats.decode")}</h4>
        <p class="big">{flopsText(next.total)}</p>
        <p>{t("stats.decodeNote", { n: positions + 1 })}</p>
        <EstimateLink />
      </div>
    </div>
    <p class="note">{t("stats.perTokenNote")}</p>
  </section>

  <section class="part" aria-labelledby="stats-totals">
    <h3><span id="stats-totals">{t("stats.totals")}</span> <EstimateLink /></h3>
    <dl class="totals">
      <div><dt>{t("stats.totalPrefill", { n: promptLength })}</dt><dd>{flopsText(cost.prefill.total)}</dd></div>
      <div><dt>{t("stats.totalDecode", { n: steps })}</dt><dd>{flopsText(cost.decode.total)}</dd></div>
      <div class="sum"><dt>{t("stats.total")}</dt><dd>{flopsText(cost.total.total)}</dd></div>
      <div>
        <dt>{t("stats.kvCache")}</dt>
        <dd>{bytesText(cache.total)}</dd>
      </div>
    </dl>
    <p class="note">{t("stats.kvCacheNote", { n: positions, layers: cache.layers })}</p>
  </section>

  <section class="part">
    <h3><span id="stats-components">{t("stats.components")}</span> <EstimateLink /></h3>
    <!-- On narrow screens the table scrolls sideways; the region takes focus so arrow keys can scroll it. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby="stats-components" tabindex="0">
      <table aria-labelledby="stats-components">
        <thead>
          <tr>
            <th scope="col">{t("stats.component")}</th>
            <th scope="col">{t("stats.colPrefill")}</th>
            <th scope="col">{t("stats.colDecode")}</th>
            <th scope="col">{t("stats.colText")}</th>
            <th scope="col">{t("table.share")}</th>
          </tr>
        </thead>
        <tbody>
          {#each COMPONENTS as part (part)}
            {@const color = colors[part]}
            <tr>
              <th scope="row">
                <span class="swatch" class:none={!color} style:--color={color} aria-hidden="true"></span>{t(
                  `stats.part.${part}`,
                )}
              </th>
              <td>{flopsText(cost.prefill.components[part] / promptLength)}</td>
              <td>{flopsText(next.components[part])}</td>
              <td>{flopsText(cost.total.components[part])}</td>
              <td>{shareText(cost.total.components[part], cost.total.total)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t("stats.total")}</th>
            <td>{flopsText(perPromptToken)}</td>
            <td>{flopsText(next.total)}</td>
            <td>{flopsText(cost.total.total)}</td>
            <td>{shareText(1, 1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="note">{t("stats.embeddings")}</p>
    <p class="note">{t("stats.lmHead", { vocabulary: GPT2_CONFIG.vocab_size })}</p>
    <p class="note">{t("stats.excluded")}</p>
  </section>

  <section class="part" aria-labelledby="stats-layers">
    <h3><span id="stats-layers">{t("stats.perLayer")}</span> <EstimateLink /></h3>
    <p class="note">{t("stats.perLayerNote")}</p>
    <LayerBars flops={cost.total} />
  </section>

  <section class="part" aria-labelledby="stats-context">
    <h3><span id="stats-context">{t("stats.context")}</span> <EstimateLink /></h3>
    <p class="note">{t("stats.contextNote", { max: GPT2_CONFIG.n_positions })}</p>
    <ContextChart config={GPT2_CONFIG} {positions} />
  </section>

  {#snippet details()}
    <p><EstimateLink /></p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby="stats-exact-caption" tabindex="0">
      <table class="exact">
        <caption id="stats-exact-caption">{t("stats.exactCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("stats.component")}</th>
            <th scope="col">{t("stats.colPrefillAll", { n: promptLength })}</th>
            <th scope="col">{t("stats.colDecodeAll", { n: steps })}</th>
            <th scope="col">{t("stats.colText")}</th>
            <th scope="col">{t("stats.colDecode")}</th>
          </tr>
        </thead>
        <tbody>
          {#each COMPONENTS as part (part)}
            <tr>
              <th scope="row">{t(`stats.part.${part}`)}</th>
              <td>{formatNumber(cost.prefill.components[part])}</td>
              <td>{formatNumber(cost.decode.components[part])}</td>
              <td>{formatNumber(cost.total.components[part])}</td>
              <td>{formatNumber(next.components[part])}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t("stats.total")}</th>
            <td>{formatNumber(cost.prefill.total)}</td>
            <td>{formatNumber(cost.decode.total)}</td>
            <td>{formatNumber(cost.total.total)}</td>
            <td>{formatNumber(next.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="note">
      {t("stats.exactNotes", { layer: cost.total.layer, perToken: perPromptToken, bytes: cache.total, n: positions })}
    </p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby="stats-context-caption" tabindex="0">
      <table class="exact">
        <caption id="stats-context-caption">{t("stats.contextExactCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("stats.contextLength")}</th>
            <th scope="col">{t("stats.part.scores")}</th>
            <th scope="col">{t("stats.part.weightedSum")}</th>
            <th scope="col">{t("stats.contextRest")}</th>
            <th scope="col">{t("stats.total")}</th>
            <th scope="col">{t("stats.contextShare")}</th>
          </tr>
        </thead>
        <tbody>
          {#each contextRows as row (row.length)}
            <tr class:current={row.length === positions}>
              <th scope="row">
                {formatNumber(row.length)}{#if row.length === positions}{` · ${t("stats.contextThis")}`}{/if}
              </th>
              <td>{formatNumber(row.scores)}</td>
              <td>{formatNumber(row.weightedSum)}</td>
              <td>{formatNumber(row.rest)}</td>
              <td>{formatNumber(row.total)}</td>
              <td>{shareText(row.scores, row.total)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/snippet}
</ViewFrame>

<style>
  .part {
    margin-top: 1.75rem;
  }
  h3 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.75rem;
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
    font-weight: 600;
  }
  h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .figures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem;
  }
  .figure {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: 0.35rem;
    padding: 0.8rem 1rem;
    border: 1.5px solid var(--line);
    border-radius: 6px;
    background: linear-gradient(180deg, var(--glass), transparent 60%), var(--paper-raised);
  }
  .figure p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .figure .big {
    font-family: var(--font-mono);
    font-size: 1.35rem;
    color: var(--ink);
  }
  .note {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .totals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.5rem 1.5rem;
    margin: 0;
    padding: 0.75rem 1rem;
    border-left: 2px solid var(--line);
    background: var(--glass);
  }
  .totals dt {
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .totals dd {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }
  .totals .sum dd {
    font-weight: 700;
  }
  .table-scroll {
    max-width: 100%;
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  caption {
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
  tbody th {
    font-weight: 400;
    white-space: nowrap;
  }
  th,
  td {
    padding: 0.25rem 1rem 0.25rem 0;
    border-bottom: 1px solid var(--rule);
  }
  td {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  tfoot th,
  tfoot td {
    font-weight: 700;
  }
  .swatch {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    margin-right: 0.45rem;
    border-radius: 2px;
    background: var(--color);
  }
  .swatch.none {
    background: none;
  }
  .exact {
    margin-top: 0.75rem;
  }
  .current th,
  .current td {
    font-weight: 700;
  }
</style>
