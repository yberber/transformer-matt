<script lang="ts">
  // Moves between Steps in every view: previous, a scrubber, and next. The Step
  // lives in the URL. Within the Steps so far, they move through the Trace at hand.
  // At its last Step, next takes one more Step with `onadvance` (Live mode) while the
  // run is under its limit; otherwise next is disabled and says why.
  import { navigate, route } from "../app/route.svelte";
  import { t } from "../i18n/i18n";

  let {
    steps,
    limit,
    endMessage,
    onadvance,
    advancing = false,
  }: {
    /** The Steps the Trace holds so far. */
    steps: number;
    /** The last Step the run can reach. */
    limit: number;
    /** Why there is no next token, once the run has reached its limit. */
    endMessage: string;
    /** Takes one more Step beyond the Trace's last. */
    onadvance?: () => void;
    /** Whether that Step is on its way. */
    advancing?: boolean;
  } = $props();

  const endId = $props.id();
  /** At the Trace's last Step so far. */
  const atLastHeld = $derived(route.step >= steps);
  const canAdvance = $derived(onadvance !== undefined && steps < limit);
  const nextDisabled = $derived(advancing || (atLastHeld && !canAdvance));
  /** At the run's last possible Step. */
  const atLimit = $derived(atLastHeld && steps >= limit);

  function go(step: number) {
    navigate({ step: Math.max(0, Math.min(steps, step)) }, { replace: true });
  }

  function next() {
    if (!atLastHeld) go(route.step + 1);
    else if (canAdvance) onadvance?.();
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
      aria-valuetext={t("step.of", { step: route.step, steps: limit })}
      oninput={(event) => go(Number(event.currentTarget.value))}
    />
  </label>
  <button
    type="button"
    class="control next"
    disabled={nextDisabled}
    aria-busy={advancing}
    aria-describedby={atLimit ? endId : undefined}
    onclick={next}
  >
    {t("step.next")}
    <span aria-hidden="true">→</span>
  </button>
  <span class="status" role="status">{advancing ? t("live.running") : t("step.of", { step: route.step, steps: limit })}</span>
  {#if atLimit}
    <p class="end" id={endId}>{endMessage}</p>
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
