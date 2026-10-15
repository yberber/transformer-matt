<script lang="ts">
  import { t } from "../i18n/i18n";
  import { displayParts, hex } from "./display";

  // Inside another control (a token chip) or a tooltip, byte markers must not be
  // buttons of their own: `plain` draws them as text, and the surrounding control
  // explains them instead.
  let { bytes, plain = false }: { bytes: Uint8Array; plain?: boolean } = $props();

  const parts = $derived(displayParts(bytes));
  const tooltipId = $props.id();
</script>

{#each parts as part, i (i)}
  {#if part.kind === "text"}{part.text}{:else if part.kind === "space"}<span
      class="marker space"
      role="img"
      aria-label={t("token.space")}>·</span
    >{:else if part.kind === "newline"}<span class="marker" role="img" aria-label={t("token.newline")}>↵</span
    >{:else if part.kind === "tab"}<span class="marker" role="img" aria-label={t("token.tab")}>→</span
    >{:else if plain}<span class="bytes">{hex(part.bytes)}</span>{:else}<span class="byte-marker"
      ><button type="button" class="bytes" aria-describedby="{tooltipId}-{i}">{hex(part.bytes)}</button
      ><span class="tooltip" role="tooltip" id="{tooltipId}-{i}"
        >{t("token.partialBytes", { bytes: hex(part.bytes) })}</span
      ></span
    >{/if}
{/each}

<style>
  .marker {
    color: var(--ink-faint);
  }
  .byte-marker {
    position: relative;
  }
  .bytes {
    font: inherit;
    color: inherit;
    background: none;
    border: 1px dashed currentColor;
    border-radius: 3px;
    padding: 0 0.2em;
    font-size: 0.8em;
    cursor: help;
  }
  .tooltip {
    display: none;
    position: absolute;
    left: 0;
    top: calc(100% + 0.4rem);
    z-index: 1;
    width: max-content;
    max-width: 18rem;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-prose);
    font-size: 0.85rem;
    line-height: 1.35;
    white-space: normal;
  }
  .byte-marker:hover .tooltip,
  .bytes:focus-visible + .tooltip {
    display: block;
  }
</style>
