<script lang="ts">
  // One model part and its parameter tensors, weight and bias as separate buttons. Choosing
  // a tensor opens its card right below the part, so on a phone it appears where it was
  // chosen; choosing it again closes the card.
  import type { Snippet } from "svelte";
  import { formatNumber, t } from "../i18n/i18n";
  import type { Tensor } from "../estimates/parameters";
  import { shapeText, shareText } from "./format";

  let {
    tensors,
    layer,
    layers,
    total,
    selected,
    onselect,
    children,
  }: {
    /** The part's tensors; all of one part. */
    tensors: Tensor[];
    /** The block they sit in, counted from 0, or none outside the blocks. */
    layer?: number;
    layers: number;
    total: number;
    /** The chosen tensor's name, if any. */
    selected: string | undefined;
    onselect: (tensor: Tensor) => void;
    /** Shown below the part's tensors. */
    children?: Snippet;
  } = $props();

  const part = $derived(tensors[0]!.part);
  const chosen = $derived(tensors.find(({ name }) => name === selected));
  // The Hugging Face name, as in the model's state dict (without "transformer.").
  const fullName = $derived(chosen && (layer === undefined ? chosen.name : `h.${layer}.${chosen.name}`));
</script>

<div class="part">
  <span class="name">{t(`arch.part.${part}`)}</span>
  <span class="tensors">
    {#each tensors as tensor (tensor.name)}
      <button type="button" class="tensor" aria-pressed={tensor.name === selected} onclick={() => onselect(tensor)}>
        <span class="visually-hidden">{t(`arch.part.${part}`)}</span>
        <span class="kind">{t(`arch.kind.${tensor.kind}`)}</span>
        <span class="shape">{shapeText(tensor.shape)}</span>
      </button>
    {/each}
  </span>
  {@render children?.()}
  {#if chosen}
    <dl class="tensor-card">
      <div class="wide"><dt>{t("arch.name")}</dt><dd><code>{fullName}</code></dd></div>
      <div><dt>{t("table.shape")}</dt><dd>{shapeText(chosen.shape)}</dd></div>
      <div><dt>{t("table.parameters")}</dt><dd>{formatNumber(chosen.count)}</dd></div>
      <div><dt>{t("arch.share")}</dt><dd>{t("arch.shareOf", { share: shareText(chosen.count, total), total })}</dd></div>
      {#if layer !== undefined}
        <div class="wide">
          <dt>{t("arch.allBlocks", { layers })}</dt>
          <dd>{formatNumber(layers * chosen.count)} ({shareText(layers * chosen.count, total)})</dd>
        </div>
      {/if}
    </dl>
  {/if}
</div>

<style>
  .part {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
  }
  .name {
    flex: 0 0 13rem;
    font-style: italic;
  }
  .tensors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  @media (width < 640px) {
    .name {
      flex-basis: 100%;
    }
  }
</style>
