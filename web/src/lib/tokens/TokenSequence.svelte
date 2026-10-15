<script lang="ts">
  // A Trace's tokens as chips: the Prompt, then the Continuation. Hovering a token,
  // focusing it (the list is one tab stop; arrow keys, Home and End move between
  // tokens) or tapping it shows the prediction the model made at its Position and
  // what actually comes next.
  import type { Snippet } from "svelte";
  import { formatPercent, t } from "../i18n/i18n";
  import type { Trace } from "../trace/decode";
  import { positionColor } from "./color";
  import { displayParts, hex } from "./display";
  import TokenText from "./TokenText.svelte";

  let { trace, label, after }: { trace: Trace; label: string; after?: Snippet } = $props();

  const SHOWN_PREDICTIONS = 3;
  const tooltipId = $props.id();
  const buttons: HTMLButtonElement[] = [];

  let tabStop = $state(0);
  let hovered = $state<number | null>(null);
  let focused = $state<number | null>(null);

  const last = $derived(trace.positions.length - 1);
  const stop = $derived(Math.min(tabStop, last));
  const active = $derived.by(() => {
    const position = hovered ?? focused;
    return position !== null && position <= last ? position : null;
  });
  const tooltip = $derived.by(() => {
    if (active === null) return null;
    const position = trace.positions[active]!;
    const next = trace.positions[active + 1];
    const rank = next ? position.predictions.findIndex((p) => p.tokenId === next.tokenId) : -1;
    const nextProbability = rank >= 0 ? position.predictions[rank]!.probability : undefined;
    const button = buttons[active];
    return {
      position: active,
      partialBytes: displayParts(position.tokenBytes).flatMap((part) => (part.kind === "bytes" ? [hex(part.bytes)] : [])),
      predictions: position.predictions.slice(0, SHOWN_PREDICTIONS),
      next,
      rank,
      nextProbability,
      left: button?.offsetLeft ?? 0,
      top: (button?.offsetTop ?? 0) + (button?.offsetHeight ?? 0),
    };
  });

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      hovered = focused = null;
      return;
    }
    const moves: Record<string, number> = { ArrowRight: stop + 1, ArrowLeft: stop - 1, Home: 0, End: last };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    tabStop = Math.max(0, Math.min(last, target));
    buttons[tabStop]?.focus();
  }

  function focus(i: number) {
    tabStop = i;
    focused = i;
  }
</script>

<div class="sequence">
  <ol class="tokens" aria-label={label}>
    {#each trace.positions as position, i (i)}
      <li>
        <button
          type="button"
          class="chip"
          class:continuation={i >= trace.promptLength}
          style:--token-color={positionColor(i)}
          tabindex={i === stop ? 0 : -1}
          aria-describedby={active === i ? tooltipId : undefined}
          bind:this={buttons[i]}
          onmouseenter={() => (hovered = i)}
          onmouseleave={() => (hovered = null)}
          onfocus={() => focus(i)}
          onblur={() => (focused = null)}
          onclick={() => focus(i)}
          {onkeydown}><TokenText bytes={position.tokenBytes} plain /></button
        >
      </li>
    {/each}
  </ol>
  {@render after?.()}

  {#if tooltip}
    <div class="tooltip" role="tooltip" id={tooltipId} style:--left="{tooltip.left}px" style:top="{tooltip.top}px">
      {#each tooltip.partialBytes as bytes (bytes)}
        <p class="partial">{t("token.partialBytes", { bytes })}</p>
      {/each}
      <p class="heading">{t("prediction.at", { n: tooltip.position })}</p>
      <ol class="top">
        {#each tooltip.predictions as prediction (prediction.tokenId)}
          <li>
            <span class="candidate"><TokenText bytes={prediction.tokenBytes} plain /></span>
            <span class="p">{formatPercent(prediction.probability)}</span>
          </li>
        {/each}
      </ol>
      {#if tooltip.next}
        <p class="actual">
          {t("prediction.actual")}
          <span class="candidate"><TokenText bytes={tooltip.next.tokenBytes} plain /></span>
          ({tooltip.nextProbability !== undefined
            ? t("prediction.actualRank", { rank: tooltip.rank + 1, probability: formatPercent(tooltip.nextProbability) })
            : t("prediction.notInTop")})
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Whatever follows the list (the Predict view's "next" chip) sits at the end of its last line when it fits. */
  .sequence {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.35rem;
    margin: 1.5rem 0;
  }
  .tokens {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chip {
    border-top: none;
    border-left: none;
    border-right: none;
    font-size: inherit;
    line-height: inherit;
    cursor: help;
  }
  /* Continuation tokens hang from a dotted rule, so the Prompt's end stays visible. */
  .chip.continuation {
    outline: 1px dotted var(--ink-faint);
    outline-offset: 2px;
  }
  .chip:focus-visible {
    outline: 2px solid var(--line);
    outline-offset: 2px;
  }
  .tooltip {
    position: absolute;
    z-index: 2;
    left: clamp(0px, var(--left), calc(100% - min(18rem, 100%)));
    width: min(18rem, 100%);
    margin-top: 0.35rem;
    padding: 0.5rem 0.7rem;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-size: 0.85rem;
    line-height: 1.35;
    pointer-events: none;
  }
  .tooltip p {
    margin: 0;
  }
  .heading {
    font-style: italic;
  }
  .partial {
    padding-bottom: 0.3rem;
    margin-bottom: 0.3rem !important;
    border-bottom: 1px solid color-mix(in oklab, var(--paper) 30%, transparent);
  }
  .top {
    display: grid;
    gap: 0.1rem;
    margin: 0.3rem 0;
    padding: 0;
    list-style: none;
  }
  .top li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  .candidate,
  .p {
    font-family: var(--font-mono);
    white-space: pre;
  }
  .actual {
    padding-top: 0.3rem;
    border-top: 1px solid color-mix(in oklab, var(--paper) 30%, transparent);
  }
</style>
