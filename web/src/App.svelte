<script lang="ts">
  import { route } from "./lib/app/route.svelte";
  import EmbeddingsView from "./lib/embed/EmbeddingsView.svelte";
  import { t } from "./lib/i18n/i18n";
  import Masthead from "./lib/shell/Masthead.svelte";
  import PendingView from "./lib/shell/PendingView.svelte";
  import PredictionView from "./lib/predict/PredictionView.svelte";
  import ExamplePicker from "./lib/shell/ExamplePicker.svelte";
  import PipelineStrip from "./lib/shell/PipelineStrip.svelte";
  import StepControls from "./lib/shell/StepControls.svelte";
  import TokenizationView from "./lib/tokens/TokenizationView.svelte";
  import { atStep, loadExample, stepCount, type Trace } from "./lib/trace/decode";

  let trace = $state<Trace>();
  let failed = $state(false);
  // Every view sees the sequence as it stands at the current Step.
  const shown = $derived(trace && atStep(trace, route.step));

  $effect(() => {
    const id = route.example;
    let current = true;
    failed = false;
    loadExample(id).then(
      (loaded) => current && (trace = loaded),
      (error: unknown) => {
        console.error(error);
        if (current) failed = true;
      },
    );
    return () => (current = false);
  });

  $effect(() => {
    document.documentElement.lang = route.lang;
  });
</script>

<div class="page">
  <Masthead />
  <main>
    <div class="bench">
      <ExamplePicker />
      {#if trace}<StepControls steps={stepCount(trace)} />{/if}
    </div>
    <PipelineStrip trace={shown} />
    {#if failed}
      <p role="alert">{t("view.loadError")}</p>
    {:else if !shown}
      <p role="status">{t("view.loading")}</p>
    {:else if route.view === "tokenize"}
      <TokenizationView trace={shown} />
    {:else if route.view === "embed"}
      <EmbeddingsView trace={shown} />
    {:else if route.view === "predict"}
      <PredictionView trace={shown} canAdvance={route.step < stepCount(trace!)} />
    {:else}
      <PendingView view={route.view} trace={shown} />
    {/if}
  </main>
</div>

<style>
  .page {
    max-width: 68rem;
    margin: 0 auto;
    padding: 0 1rem;
  }
  .bench {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.5rem;
    margin-top: 1.5rem;
  }
</style>
