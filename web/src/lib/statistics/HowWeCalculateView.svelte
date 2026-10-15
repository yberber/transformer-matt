<script lang="ts">
  // "How we calculate": every formula behind the statistics and what they leave out. The
  // formulas are written here in symbols; every number is the Estimates module's own, so the
  // page cannot drift from the figures it explains.
  import { GPT2_CONFIG } from "../estimates/config";
  import { BLOCK_COMPONENTS, decodeFlops, type BlockComponent } from "../estimates/flops";
  import { kvCacheBytes } from "../estimates/kvCache";
  import { parameters } from "../estimates/parameters";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";

  const { n_embd: width, n_layer: layers, vocab_size: vocabulary } = GPT2_CONFIG;
  const { heads, headWidth } = parameters(GPT2_CONFIG).qkv;

  // A token's cost is linear in the Positions n it reads: reading none gives the fixed part,
  // reading one adds the part per Position.
  const readingNone = decodeFlops(GPT2_CONFIG, 0);
  const readingOne = decodeFlops(GPT2_CONFIG, 1);
  const perPosition = readingOne.total - readingNone.total;

  const FORMULA: Record<BlockComponent, string> = {
    qkv: "2 · d · 3d",
    scores: "2 · d · n",
    weightedSum: "2 · d · n",
    outputProjection: "2 · d · d",
    mlp: "2 · d · 4d + 2 · 4d · d",
  };

  /** A layer's FLOPs for one token, written as its fixed part plus its part per Position. */
  function perLayerText(part: BlockComponent): string {
    const fixed = readingNone.perLayer[part];
    const linear = readingOne.perLayer[part] - fixed;
    if (!linear) return formatNumber(fixed);
    return fixed ? `${formatNumber(fixed)} + ${formatNumber(linear)} · n` : `${formatNumber(linear)} · n`;
  }

  const SYMBOLS = [
    { symbol: "d", name: "n_embd", value: width, key: "calc.symbol.d" },
    { symbol: "L", name: "n_layer", value: layers, key: "calc.symbol.L" },
    { symbol: "V", name: "vocab_size", value: vocabulary, key: "calc.symbol.V" },
    { symbol: "n", key: "calc.symbol.n" },
    { symbol: "P", key: "calc.symbol.P" },
    { symbol: "s", key: "calc.symbol.s" },
  ] as const;

  const LEFT_OUT = ["calc.leftOut.softmax", "calc.leftOut.layerNorm", "calc.leftOut.gelu", "calc.leftOut.residual", "calc.leftOut.bias"] as const;
</script>

<ViewFrame view="calculate">
  {#snippet lead()}<Message key="view.calculate.lead" />{/snippet}

  <section class="part">
    <h3>{t("calc.countTitle")}</h3>
    <p>{t("calc.count")}</p>
    <dl class="symbols" aria-label={t("calc.symbolsTitle")}>
      {#each SYMBOLS as entry (entry.symbol)}
        <div>
          <dt><var>{entry.symbol}</var></dt>
          <dd>
            {t(entry.key)}{#if "name" in entry}: <code>{entry.name}</code> = {formatNumber(entry.value)}{/if}
          </dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="part">
    <h3 id="calc-layer">{t("calc.layerTitle")}</h3>
    <!-- On narrow screens the table scrolls sideways; the region takes focus so arrow keys can scroll it. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby="calc-layer" tabindex="0">
      <table aria-labelledby="calc-layer">
        <thead>
          <tr>
            <th scope="col">{t("stats.component")}</th>
            <th scope="col">{t("calc.formula")}</th>
            <th scope="col">{t("calc.flops")}</th>
          </tr>
        </thead>
        <tbody>
          {#each BLOCK_COMPONENTS as part (part)}
            <tr><th scope="row">{t(`stats.part.${part}`)}</th><td>{FORMULA[part]}</td><td>{perLayerText(part)}</td></tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t("calc.oneLayer")}</th>
            <td>24d² + 4d · n</td>
            <td>{formatNumber(readingNone.layer)} + {formatNumber(readingOne.layer - readingNone.layer)} · n</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="note">{t("calc.attention", { heads, headWidth, width })}</p>
  </section>

  <section class="part">
    <h3>{t("calc.outsideTitle")}</h3>
    <ul class="plain">
      <li>{t("calc.embeddings")} <span class="formula">0</span></li>
      <li>{t("calc.lmHead", { vocabulary })} <span class="formula">2 · d · V = {formatNumber(readingOne.components.lmHead)}</span></li>
    </ul>
  </section>

  <section class="part">
    <h3>{t("calc.decodeTitle")}</h3>
    <p>{t("calc.decode")}</p>
    <p class="formula">
      decode(n) = L · (24d² + 4d · n) + 2d · V = {formatNumber(readingNone.total)} + {formatNumber(perPosition)} · n
    </p>
  </section>

  <section class="part">
    <h3>{t("calc.prefillTitle")}</h3>
    <p>{t("calc.prefill")}</p>
    <p class="formula">prefill(P) = decode(1) + decode(2) + … + decode(P)</p>
    <p class="formula">= {formatNumber(readingNone.total)} · P + {formatNumber(perPosition)} · P(P + 1) / 2</p>
  </section>

  <section class="part">
    <h3>{t("calc.textTitle")}</h3>
    <p>{t("calc.text")}</p>
    <p class="formula">prefill(P) + decode(P + 1) + … + decode(P + s) = prefill(P + s)</p>
    <p>{t("calc.perToken")}</p>
  </section>

  <section class="part">
    <h3>{t("calc.kvTitle")}</h3>
    <p>{t("calc.kv")}</p>
    <p class="formula">{t("calc.kvFormula", { bytes: kvCacheBytes(GPT2_CONFIG, 1).total })}</p>
    <p class="note">{t("calc.units")}</p>
  </section>

  <section class="part">
    <h3 id="calc-left-out">{t("calc.leftOutTitle")}</h3>
    <ul class="left-out" aria-labelledby="calc-left-out">
      {#each LEFT_OUT as key (key)}<li>{t(key, { headWidth })}</li>{/each}
    </ul>
    <p class="note">{t("calc.leftOutNote")}</p>
  </section>

  {#snippet details()}
    <p class="note">{t("calc.estimate")}</p>
    <p class="note">{t("calc.source")}</p>
  {/snippet}
</ViewFrame>

<style>
  .part {
    max-width: 44rem;
    margin-top: 1.75rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
    font-weight: 600;
  }
  p {
    margin: 0.5rem 0;
  }
  .note {
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .formula {
    width: fit-content;
    max-width: 100%;
    padding: 0.3rem 0.7rem;
    border-left: 2px solid var(--line);
    background: var(--glass);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  li .formula {
    display: inline-block;
    margin-top: 0.25rem;
  }
  .symbols {
    display: grid;
    gap: 0.25rem;
    margin: 0.75rem 0 0;
  }
  .symbols div {
    display: grid;
    grid-template-columns: 1.5rem 1fr;
    gap: 0.5rem;
  }
  .symbols dd {
    margin: 0;
  }
  var {
    font-family: var(--font-mono);
    font-style: normal;
    font-weight: 700;
    color: var(--line);
  }
  .plain,
  .left-out {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding-left: 1.25rem;
  }
  .table-scroll {
    max-width: 100%;
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th {
    font-weight: 600;
    text-align: left;
  }
  tbody th {
    font-weight: 400;
  }
  th,
  td {
    padding: 0.25rem 1rem 0.25rem 0;
    border-bottom: 1px solid var(--rule);
  }
  td {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  td:last-child {
    text-align: right;
  }
  tfoot th,
  tfoot td {
    font-weight: 700;
  }
</style>
