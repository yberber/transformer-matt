<script lang="ts">
  // Moves between Steps in every view: previous, a scrubber, and next. The Step
  // lives in the URL. After the last precomputed Step, next is disabled and says why.
  import { navigate, route } from "../app/route.svelte";
  import { t } from "../i18n/i18n";

  let { steps }: { steps: number } = $props();

  const endId = $props.id();
  const atEnd = $derived(route.step >= steps);

  function go(step: number) {
    navigate({ step: Math.max(0, Math.min(steps, step)) }, { replace: true });
  }
</script>

<div class="steps" role="group" aria-label={t("step.controls")}>
  <button type="button" class="control" disabled={route.step === 0} onclick={() => go(route.step - 1)}>
    <span aria-hidden="true">←</span>
    {t("step.previous")}
  </button>
  <label class="scrubber">
    <span>{t("step.label")}</span>
    <input
      type="range"
      min="0"
      max={steps}
      value={route.step}
      aria-valuetext={t("step.of", { step: route.step, steps })}
      oninput={(event) => go(Number(event.currentTarget.value))}
    />
  </label>
  <button
    type="button"
    class="control next"
    disabled={atEnd}
    aria-describedby={atEnd ? endId : undefined}
    onclick={() => go(route.step + 1)}
  >
    {t("step.next")}
    <span aria-hidden="true">→</span>
  </button>
  <span class="status" role="status">{t("step.of", { step: route.step, steps })}</span>
  {#if atEnd}
    <p class="end" id={endId}>{t("step.end", { steps })}</p>
  {/if}
</div>

<style>
  .steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
  }
  .control:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .next:not(:disabled) {
    border-color: var(--line);
    color: var(--line);
  }
  .scrubber {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  input {
    width: clamp(8rem, 30vw, 16rem);
    accent-color: var(--line);
  }
  .status {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  .end {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
</style>
