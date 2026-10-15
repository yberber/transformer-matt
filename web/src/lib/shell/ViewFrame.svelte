<script lang="ts">
  // Every view's frame, a specimen card: a catalogue label (its stage's number, the view, Step), the one-sentence
  // plain-language explanation first, then the view, then the exact numbers
  // behind "Show details".
  import type { Snippet } from "svelte";
  import { route } from "../app/route.svelte";
  import { STAGES, stageOf, type View } from "../app/viewState";
  import { t } from "../i18n/i18n";
  import { EXAMPLE_STEPS } from "../trace/examples";

  let { view, lead, children, details }: { view: View; lead: Snippet; children?: Snippet; details: Snippet } =
    $props();

  // A separate page sits outside the pipeline and is the same at every Step, so it carries neither label.
  const stage = $derived(stageOf(view));
  const number = $derived(stage && String(STAGES.indexOf(stage) + 1).padStart(2, "0"));
</script>

<section class="specimen" aria-labelledby="view-heading">
  <span class="crop tl"></span><span class="crop tr"></span><span class="crop bl"></span><span class="crop br"></span>
  <header class="label">
    {#if number}<span class="number">{t("view.number", { n: number })}</span>{/if}
    <h2 id="view-heading">{t(`stage.${view}`)}</h2>
    {#if stage}<span class="number">{t("step.of", { step: route.step, steps: EXAMPLE_STEPS })}</span>{/if}
  </header>
  <p class="lead">{@render lead()}</p>
  {@render children?.()}
  <details>
    <summary>{t("view.showDetails")}</summary>
    {@render details()}
  </details>
</section>

<style>
  .specimen {
    position: relative;
    margin: 2rem 0 4rem;
    padding: 1.75rem clamp(1rem, 4vw, 2.5rem) 2rem;
  }
  .crop {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 0 solid var(--line);
  }
  .tl {
    top: 0;
    left: 0;
    border-top-width: 1.5px;
    border-left-width: 1.5px;
  }
  .tr {
    top: 0;
    right: 0;
    border-top-width: 1.5px;
    border-right-width: 1.5px;
  }
  .bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 1.5px;
    border-left-width: 1.5px;
  }
  .br {
    bottom: 0;
    right: 0;
    border-bottom-width: 1.5px;
    border-right-width: 1.5px;
  }
  .label {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--line-soft);
  }
  .number {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  h2 {
    flex: 1;
    margin: 0;
    font-size: 1.6rem;
    font-weight: 400;
  }
  .lead {
    max-width: 40rem;
    font-size: 1.15rem;
  }
  details {
    margin-top: 1.25rem;
  }
  summary {
    width: fit-content;
    cursor: pointer;
    color: var(--line);
  }
</style>
