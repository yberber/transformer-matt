<script lang="ts">
  // The whole model on one page, top to bottom in the order the numbers flow: the two
  // embedding tables, the transformer block drawn once with ×n_layer, the final LayerNorm and
  // the LM head. Any block can be expanded to choose its tensors; choosing a tensor shows
  // its shape, parameter count and share of all parameters. Every number comes from the
  // official config through the Estimates module; none is written here.
  import { GPT2_CONFIG } from "../estimates/config";
  import { parameters, type Part, type Tensor } from "../estimates/parameters";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import type { TraceHeader } from "../trace/decode";
  import { shapeText, shareText, tensorLabel } from "./format";
  import PartRow from "./PartRow.svelte";
  import QkvMatrix from "./QkvMatrix.svelte";

  // The loaded Example's header, if any, names the model revision the config comes from.
  let { header }: { header: TraceHeader | undefined } = $props();

  const model = parameters(GPT2_CONFIG);
  const { total, layers, lmHead, qkv } = model;
  const tied = lmHead.tiedTo;

  /** The block expanded to show its tensors, counted from 0. */
  let expanded = $state<number>();
  /** The chosen tensor's name, or the LM head's; a block's tensors are those of the expanded block. */
  let selected = $state<string>();

  function of(tensors: Tensor[], part: Part): Tensor[] {
    return tensors.filter((tensor) => tensor.part === part);
  }
  const inBlock = (name: string | undefined) => model.block.some((tensor) => tensor.name === name);

  function select({ name }: { name: string }) {
    selected = selected === name ? undefined : name;
  }

  function toggle(layer: number) {
    expanded = expanded === layer ? undefined : layer;
    if (expanded === undefined && inBlock(selected)) selected = undefined;
  }

  // Said once for screen readers whenever the choice changes; the card shows the same.
  const announcement = $derived.by(() => {
    if (selected === lmHead.name) return t("arch.lmHeadAnnounce", { shape: shapeText(lmHead.shape), name: tied.name });
    const block = inBlock(selected);
    const tensor = [...model.embeddings, ...model.block, ...model.final].find(({ name }) => name === selected);
    if (!tensor) return "";
    return t("arch.announce", {
      tensor: tensorLabel(tensor, block ? expanded : undefined),
      shape: shapeText(tensor.shape),
      count: tensor.count,
      share: shareText(tensor.count, total),
    });
  });

  const rowProps = $derived({ layers, total, selected, onselect: select });
</script>

<ViewFrame view="architecture">
  {#snippet lead()}<Message key="view.architecture.lead" params={{ total, layers }} />{/snippet}

  <p class="hint">{t("arch.hint")}</p>
  <p class="visually-hidden" role="status">{announcement}</p>

  <ol class="diagram">
    <li class="io">{t("arch.input", { positions: GPT2_CONFIG.n_positions })}</li>

    <li class="stage">
      <h3>{t("arch.embeddings")}</h3>
      {#each model.embeddings as tensor (tensor.name)}
        <PartRow tensors={[tensor]} {...rowProps} />
      {/each}
      <p class="join"><span class="op" aria-hidden="true">+</span> {t("arch.added")}</p>
    </li>

    <li class="stage stack">
      <h3>{t("arch.block")} <span class="times">×{layers}</span></h3>
      <p class="sum">{t("arch.perBlock", { count: model.perBlock, layers, total: model.blocksTotal })}</p>
      <div class="expanders" role="group" aria-label={t("arch.expand")}>
        <span class="expand-label" aria-hidden="true">{t("arch.expand")}</span>
        {#each { length: layers }, layer (layer)}
          <button
            type="button"
            class="expander"
            aria-expanded={expanded === layer}
            aria-controls="architecture-block"
            onclick={() => toggle(layer)}
            ><span class="visually-hidden">{t("arch.blockN", { n: layer + 1 })}</span><span aria-hidden="true"
              >{layer + 1}</span
            ></button
          >
        {/each}
      </div>
      {#if expanded === undefined}
        <p class="outline">
          {t("arch.part.ln_1")} → {t("blocks.attentionTitle")} → {t("arch.part.ln_2")} → {t("blocks.mlpTitle")}
        </p>
        <p class="note">{t("arch.collapsed", { layers })}</p>
      {/if}
      <div id="architecture-block" class="open-block" hidden={expanded === undefined}>
        {#if expanded !== undefined}
          <h4>{t("arch.blockOf", { n: expanded + 1, layers })}</h4>
          <PartRow tensors={of(model.block, "ln_1")} layer={expanded} {...rowProps} />
          <h5>{t("blocks.attentionTitle")}</h5>
          <PartRow tensors={of(model.block, "attn.c_attn")} layer={expanded} {...rowProps}>
            <QkvMatrix rows={GPT2_CONFIG.n_embd} heads={qkv.heads} headWidth={qkv.headWidth} />
          </PartRow>
          <PartRow tensors={of(model.block, "attn.c_proj")} layer={expanded} {...rowProps} />
          <p class="join"><span class="op" aria-hidden="true">+</span> {t("arch.residual")}</p>
          <PartRow tensors={of(model.block, "ln_2")} layer={expanded} {...rowProps} />
          <h5>{t("blocks.mlpTitle")}</h5>
          <PartRow tensors={of(model.block, "mlp.c_fc")} layer={expanded} {...rowProps} />
          <p class="join"><span class="op" aria-hidden="true">ƒ</span> {t("arch.gelu")}</p>
          <PartRow tensors={of(model.block, "mlp.c_proj")} layer={expanded} {...rowProps} />
          <p class="join"><span class="op" aria-hidden="true">+</span> {t("arch.residual")}</p>
        {/if}
      </div>
    </li>

    <li class="stage">
      <h3>{t("arch.after")}</h3>
      <PartRow tensors={model.final} {...rowProps} />
    </li>

    <li class="stage">
      <h3>{t("arch.lmHead")}</h3>
      <div class="lm-head">
        <button type="button" class="tensor tied" aria-pressed={selected === lmHead.name} onclick={() => select(lmHead)}>
          <span class="visually-hidden">{t("arch.lmHead")}</span>
          <span class="kind">{t("arch.kind.weight")}</span>
          <span class="shape">{shapeText(lmHead.shape)}</span>
          <span class="tag">{t("arch.tied")}</span>
        </button>
        <p class="note">{t("arch.lmHeadNote")}</p>
        {#if selected === lmHead.name}
          <dl class="tensor-card">
            <div><dt>{t("arch.name")}</dt><dd><code>{lmHead.name}</code></dd></div>
            <div><dt>{t("table.shape")}</dt><dd>{shapeText(lmHead.shape)}</dd></div>
            <div><dt>{t("arch.sharedWith")}</dt><dd><code>{tied.name}</code></dd></div>
            <div><dt>{t("arch.addedParameters")}</dt><dd>{formatNumber(0)}</dd></div>
          </dl>
        {/if}
      </div>
    </li>

    <li class="io">{t("arch.output", { vocabulary: GPT2_CONFIG.vocab_size })}</li>
  </ol>

  <p class="total">
    {t("arch.total", {
      total,
      embeddings: model.embeddingsTotal,
      layers,
      blocks: model.blocksTotal,
      final: model.finalTotal,
    })}
  </p>

  {#snippet details()}
    {#snippet row(name: string, shape: number[], count: number)}
      <tr><td><code>{name}</code></td><td>{shapeText(shape)}</td><td>{formatNumber(count)}</td><td>{shareText(count, total)}</td></tr>
    {/snippet}
    <!-- On narrow screens the table scrolls sideways; the region takes focus so arrow keys can scroll it. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby="architecture-table-caption" tabindex="0">
      <table>
        <caption id="architecture-table-caption">{t("arch.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("table.tensor")}</th>
            <th scope="col">{t("table.shape")}</th>
            <th scope="col">{t("table.parameters")}</th>
            <th scope="col">{t("table.share")}</th>
          </tr>
        </thead>
        <tbody>
          <tr><th scope="rowgroup" colspan="4">{t("arch.embeddings")}</th></tr>
          {#each model.embeddings as { name, shape, count } (name)}{@render row(name, shape, count)}{/each}
        </tbody>
        <tbody>
          <tr><th scope="rowgroup" colspan="4">{t("arch.tableBlock", { last: layers - 1 })}</th></tr>
          {#each model.block as { name, shape, count } (name)}{@render row(name, shape, count)}{/each}
          <tr class="subtotal"><td>{t("arch.tableOneBlock")}</td><td></td><td>{formatNumber(model.perBlock)}</td><td>{shareText(model.perBlock, total)}</td></tr>
          <tr class="subtotal"><td>{t("arch.tableAllBlocks", { layers })}</td><td></td><td>{formatNumber(model.blocksTotal)}</td><td>{shareText(model.blocksTotal, total)}</td></tr>
        </tbody>
        <tbody>
          <tr><th scope="rowgroup" colspan="4">{t("arch.after")}</th></tr>
          {#each model.final as { name, shape, count } (name)}{@render row(name, shape, count)}{/each}
          <tr><td><code>{lmHead.name}</code></td><td>{shapeText(lmHead.shape)}</td><td>{formatNumber(0)}</td><td>{t("arch.tableTied", { name: tied.name })}</td></tr>
        </tbody>
        <tfoot>
          <tr><th scope="row">{t("arch.tableTotal")}</th><td></td><td>{formatNumber(total)}</td><td>{shareText(total, total)}</td></tr>
        </tfoot>
      </table>
    </div>
    <p class="note">
      {t("arch.how", {
        vocabulary: GPT2_CONFIG.vocab_size,
        positions: GPT2_CONFIG.n_positions,
        width: GPT2_CONFIG.n_embd,
        layers,
        heads: GPT2_CONFIG.n_head,
        inner: model.mlpWidth,
      })}
    </p>
    <p class="note">{t("arch.names")}</p>
    {#if header}
      <p class="note source">{t("view.configSource", { model: header.model_id, revision: header.model_revision })}</p>
    {/if}
  {/snippet}
</ViewFrame>

<style>
  .hint,
  .note,
  .sum,
  .outline {
    max-width: 40rem;
    margin: 0.5rem 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .note {
    font-size: 0.8rem;
  }
  .diagram {
    display: grid;
    gap: 0;
    margin: 1.25rem 0 0;
    padding: 0;
    list-style: none;
  }
  /* The numbers flow down a pipe from stage to stage. */
  .diagram > li + li {
    position: relative;
    margin-top: 1.4rem;
  }
  .diagram > li + li::before {
    content: "";
    position: absolute;
    top: -1.4rem;
    left: 1.5rem;
    height: 1.4rem;
    border-left: 1.5px solid var(--line);
  }
  .io {
    width: fit-content;
    padding: 0.2rem 0.7rem;
    border: 1px dashed var(--line-soft);
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .stage {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.8rem clamp(0.6rem, 2.5vw, 1.1rem) 0.9rem;
    border: 1.5px solid var(--line);
    border-radius: 6px;
    background: linear-gradient(180deg, var(--glass), transparent 60%), var(--paper-raised);
  }
  /* Drawn once, with the other blocks stacked behind it. */
  .stack {
    margin-right: 10px;
    box-shadow:
      4px 4px 0 -1.5px var(--paper-raised),
      4px 4px 0 0 var(--line-soft),
      8px 8px 0 -1.5px var(--paper-raised),
      8px 8px 0 0 var(--line-soft);
  }
  h3,
  h4,
  h5 {
    margin: 0;
    font-weight: 600;
  }
  h3 {
    font-size: 1.05rem;
  }
  h4 {
    font-size: 0.95rem;
  }
  h5 {
    margin-top: 0.4rem;
    font-size: 0.85rem;
    font-weight: 400;
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-secondary);
  }
  .times {
    font-family: var(--font-mono);
    font-weight: 400;
    color: var(--line);
  }
  .sum,
  .outline,
  .note {
    margin: 0;
  }
  .join {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  .op {
    display: inline-grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border: 1px solid var(--line);
    border-radius: 50%;
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 0.8rem;
    color: var(--line);
  }
  .expanders {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .expand-label {
    margin-right: 0.3rem;
    font-size: 0.85rem;
  }
  .expander {
    min-width: 2.1rem;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--line-soft);
    border-radius: 4px;
    background: var(--paper-raised);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .expander[aria-expanded="true"] {
    border-color: var(--line);
    box-shadow: inset 0 0 0 1.5px var(--line);
    color: var(--line);
    font-weight: 700;
  }
  .open-block {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line-soft);
  }
  .open-block[hidden] {
    display: none;
  }
  .lm-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
  }
  .lm-head .note {
    flex: 1 1 18rem;
  }
  /* Tied: drawn dashed, as a matrix borrowed from elsewhere. */
  .tensor.tied {
    border: 1px dashed var(--line);
  }
  .tensor.tied[aria-pressed="true"] {
    border-style: solid;
  }
  .tag {
    padding: 0 0.3rem;
    border: 1px solid var(--line-soft);
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .total {
    max-width: 40rem;
    margin: 1.5rem 0 0;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line-soft);
  }
  .source {
    overflow-wrap: anywhere;
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
    padding-top: 0.75rem;
    font-style: italic;
    font-weight: 400;
  }
  th,
  td {
    padding: 0.2rem 1rem 0.2rem 0;
    border-bottom: 1px solid var(--rule);
  }
  td:nth-child(n + 3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .subtotal td,
  tfoot td,
  tfoot th {
    font-weight: 600;
  }
  .subtotal td:first-child {
    font-family: var(--font-prose);
  }
</style>
