<script lang="ts">
  // One transformer block at a time, stepped through layer by layer. Each layer shows
  // its two parts in the order the model runs them: attention, summarised for the last
  // Position and linking to the full heatmap at this layer, then the MLP's impact on
  // every Position. After them, the logit lens: what the model would predict at the last
  // Position if it stopped after this layer.
  import { navigate, route, routeUrl } from "../app/route.svelte";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, formatPercent, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import { positionColor } from "../tokens/color";
  import { spokenToken } from "../tokens/spoken";
  import TokenText from "../tokens/TokenText.svelte";
  import type { Trace } from "../trace/decode";
  import LayerControls from "./LayerControls.svelte";

  let { trace }: { trace: Trace } = $props();

  // Six decimals, as for the predictions: every digit the 1e-4 check against Hugging Face can see.
  const EXACT = { minimumFractionDigits: 6, maximumFractionDigits: 6 };
  // The attention summary names the last Position's most looked-at tokens.
  const SHOWN = 3;

  const config = $derived(trace.header.config);
  const n = $derived(trace.positions.length);
  const last = $derived(trace.positions[n - 1]!);
  const query = $derived(spokenToken(last.tokenBytes));
  // Counted from 0, to index the Trace's per-layer values.
  const layer = $derived(route.layer - 1);

  // The last Position's attention in this layer, averaged over the heads, most first.
  const looks = $derived.by(() => {
    const heads = last.attention[layer]!;
    return Array.from({ length: n }, (_, key) => ({
      key,
      weight: heads.reduce((sum, row) => sum + row[key]!, 0) / heads.length,
    }))
      .sort((a, b) => b.weight - a.weight || a.key - b.key)
      .slice(0, SHOWN);
  });
  const impacts = $derived(trace.positions.map((position) => position.mlpImpact[layer]!));
  const lens = $derived(last.logitLens[layer]!);
</script>

<ViewFrame view="blocks">
  {#snippet lead()}<Message key="view.blocks.lead" params={{ layers: config.n_layer }} />{/snippet}

  <LayerControls guesses={last.logitLens.map((top) => top[0]!)} />

  <div class="block">
    <section class="part">
      <h3><span class="step" aria-hidden="true">1</span> {t("blocks.attentionTitle")}</h3>
      <p>{t("blocks.attention", { heads: config.n_head, query, n: n - 1 })}</p>
      <ol class="ranked" aria-label={t("attention.rankedLabel", { query, n: n - 1 })}>
        {#each looks as { key, weight } (key)}
          <li style:--token-color={positionColor(key)}>
            <span class="token"><span class="chip"><TokenText bytes={trace.positions[key]!.tokenBytes} plain /></span><span
                class="n">{key}</span
              ></span>
            <span class="bar" aria-hidden="true"><span style:width="{weight * 100}%"></span></span>
            <span class="p">{formatPercent(weight)}</span>
          </li>
        {/each}
      </ol>
      <p>
        <a
          href={routeUrl({ ...route, view: "attention" })}
          onclick={(event) => {
            event.preventDefault();
            navigate({ view: "attention" });
          }}>{t("blocks.attentionLink", { layer: route.layer })}</a
        >
      </p>
    </section>

    <section class="part">
      <h3><span class="step" aria-hidden="true">2</span> {t("blocks.mlpTitle")}</h3>
      <p>{t("blocks.mlp")}</p>
      <ol class="impacts" aria-label={t("blocks.mlpLabel", { layer: route.layer })}>
        {#each impacts as impact, i (i)}
          <li style:--token-color={positionColor(i)}>
            <span class="meter" class:over={impact > 1} aria-hidden="true"
              ><span style:height="{Math.min(impact, 1) * 100}%"></span></span
            >
            <span class="chip"><TokenText bytes={trace.positions[i]!.tokenBytes} plain /></span>
            <span class="value"><span class="visually-hidden">{t("blocks.mlpPosition", { n: i })}</span>{formatPercent(impact)}</span>
          </li>
        {/each}
      </ol>
      <p class="note">{t("blocks.mlpScale")}</p>
    </section>

    <section class="part">
      <h3>{t("blocks.lensTitle")}</h3>
      <p>{t("blocks.lens", { layer: route.layer, query, n: n - 1 })}</p>
      <ol class="ranked lens" aria-label={t("blocks.lensLabel", { layer: route.layer })}>
        {#each lens as guess, i (guess.tokenId)}
          <li class:winner={i === 0}>
            <span class="rank">{i + 1}</span>
            <span class="candidate"><TokenText bytes={guess.tokenBytes} /></span>
            <span class="bar" aria-hidden="true"><span style:width="{guess.probability * 100}%"></span></span>
            <span class="p">{formatPercent(guess.probability)}</span>
          </li>
        {/each}
      </ol>
      <p class="note">
        {layer === config.n_layer - 1 ? t("blocks.lensLast") : t("blocks.lensScale")}
      </p>
    </section>
  </div>

  {#snippet details()}
    <div class="tables">
      <div class="table-scroll">
        <table>
          <caption>{t("blocks.mlpCaption", { layer: route.layer })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("table.position")}</th>
              <th scope="col">{t("table.token")}</th>
              <th scope="col">{t("table.impact")}</th>
            </tr>
          </thead>
          <tbody>
            {#each impacts as impact, i (i)}
              <tr>
                <td>{i}</td>
                <td class="token-cell" style:--token-color={positionColor(i)}><TokenText bytes={trace.positions[i]!.tokenBytes} /></td>
                <td>{formatNumber(impact, EXACT)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="table-scroll">
        <table>
          <caption>{t("blocks.lensCaption", { layer: route.layer, query, n: n - 1 })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("table.rank")}</th>
              <th scope="col">{t("table.token")}</th>
              <th scope="col">{t("table.tokenId")}</th>
              <th scope="col">{t("table.probability")}</th>
            </tr>
          </thead>
          <tbody>
            {#each lens as guess, i (guess.tokenId)}
              <tr>
                <td>{i + 1}</td>
                <td class="token-cell"><TokenText bytes={guess.tokenBytes} /></td>
                <td>{guess.tokenId}</td>
                <td>{formatNumber(guess.probability, EXACT)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    <p class="note">{t("blocks.mlpHow", { width: config.n_embd })}</p>
    <p class="note">{t("blocks.lensHow")}</p>
    <p class="note">
      {t("blocks.config", { layers: config.n_layer, heads: config.n_head, headWidth: config.n_embd / config.n_head })}
    </p>
    <p class="note source">{t("view.configSource", { model: trace.header.model_id, revision: trace.header.model_revision })}</p>
  {/snippet}
</ViewFrame>

<style>
  .block {
    display: grid;
    gap: 1.5rem;
  }
  .part {
    min-width: 0;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line-soft);
  }
  .part > p,
  .ranked {
    max-width: 40rem;
  }
  h3 {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
  }
  .step {
    display: inline-grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border: 1px solid var(--line);
    border-radius: 50%;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--line);
  }
  .part > p {
    margin: 0.5rem 0;
  }
  .ranked {
    display: grid;
    gap: 0.3rem;
    margin: 0.75rem 0;
    padding: 0;
    list-style: none;
  }
  .ranked li {
    display: grid;
    grid-template-columns: minmax(0, 8rem) 1fr 3.75rem;
    gap: 0.6rem;
    align-items: center;
  }
  .lens li {
    grid-template-columns: 2ch minmax(0, 8rem) 1fr 3.75rem;
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
  .p,
  .rank {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--ink-secondary);
  }
  .p,
  .rank {
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
    background: var(--token-color, var(--line));
  }
  .lens .bar span {
    opacity: 0.55;
  }
  .lens .winner .bar span {
    opacity: 1;
  }
  .impacts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 0.3rem;
    margin: 0.75rem 0 0.5rem;
    padding: 0;
    list-style: none;
  }
  .impacts li {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    min-width: 2.6rem;
  }
  .meter {
    position: relative;
    display: flex;
    align-items: flex-end;
    width: 0.6rem;
    height: 2.5rem;
    border-bottom: 1px solid var(--line-soft);
    background: var(--rule);
  }
  .meter span {
    width: 100%;
    background: var(--line);
  }
  /* More than the residual stream already held: the bar runs off its scale. */
  .meter.over::before {
    content: "";
    position: absolute;
    top: -0.45rem;
    left: 50%;
    translate: -50% 0;
    border: 0.3rem solid transparent;
    border-top: none;
    border-bottom: 0.4rem solid var(--line);
  }
  .impacts .chip {
    font-size: 0.85rem;
  }
  .value {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--ink-secondary);
  }
  .note {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .source {
    overflow-wrap: anywhere;
  }
  .tables {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0 2.5rem;
  }
  .table-scroll {
    max-width: 100%;
    overflow-x: auto;
  }
  table {
    margin-top: 0.75rem;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  caption {
    max-width: 24rem;
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
  .token-cell {
    white-space: pre;
    box-shadow: inset 3px 0 0 var(--token-color, transparent);
    padding-left: 0.5rem;
  }
</style>
