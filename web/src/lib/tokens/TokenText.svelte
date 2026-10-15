<script lang="ts">
  import { displayParts, hex } from "./display";

  let { bytes }: { bytes: Uint8Array } = $props();

  const parts = $derived(displayParts(bytes));
  const tooltipId = $props.id();
</script>

{#each parts as part, i (i)}
  {#if part.kind === "text"}{part.text}{:else if part.kind === "space"}<span
      class="marker space"
      role="img"
      aria-label="space">·</span
    >{:else if part.kind === "newline"}<span class="marker" role="img" aria-label="newline">↵</span
    >{:else if part.kind === "tab"}<span class="marker" role="img" aria-label="tab">→</span
    >{:else}<span class="byte-marker"
      ><button type="button" class="bytes" aria-describedby="{tooltipId}-{i}">{hex(part.bytes)}</button
      ><span class="tooltip" role="tooltip" id="{tooltipId}-{i}"
        >Bytes {hex(part.bytes)} are part of a character: a single character can take up to 4
        bytes, and here they are split across neighbouring tokens.</span
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
