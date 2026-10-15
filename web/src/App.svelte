<script lang="ts">
  import { untrack } from "svelte";
  import { navigate, onHistoryMove, route } from "./lib/app/route.svelte";
  import { stepLimit } from "./lib/app/viewState";
  import ArchitectureView from "./lib/architecture/ArchitectureView.svelte";
  import AttentionView from "./lib/attention/AttentionView.svelte";
  import BlocksView from "./lib/blocks/BlocksView.svelte";
  import EmbeddingsView from "./lib/embed/EmbeddingsView.svelte";
  import { t } from "./lib/i18n/i18n";
  import LivePanel from "./lib/live/LivePanel.svelte";
  import LiveToggle from "./lib/live/LiveToggle.svelte";
  import { live } from "./lib/live/session.svelte";
  import Masthead from "./lib/shell/Masthead.svelte";
  import PredictionView from "./lib/predict/PredictionView.svelte";
  import HowWeCalculateView from "./lib/statistics/HowWeCalculateView.svelte";
  import StatisticsView from "./lib/statistics/StatisticsView.svelte";
  import ExamplePicker from "./lib/shell/ExamplePicker.svelte";
  import PageLinks from "./lib/shell/PageLinks.svelte";
  import PipelineStrip from "./lib/shell/PipelineStrip.svelte";
  import StepControls from "./lib/shell/StepControls.svelte";
  import TokenizationView from "./lib/tokens/TokenizationView.svelte";
  import { atStep, loadExample, stepCount, type Trace } from "./lib/trace/decode";

  let exampleTrace = $state<Trace>();
  let failed = $state(false);
  // Example mode shows the Example's Trace; Live mode the run held in the browser.
  const liveMode = $derived(route.mode === "live");
  const trace = $derived(liveMode ? live.trace : exampleTrace);
  const limit = $derived(stepLimit(route.mode));
  // Every view sees the sequence as it stands at the current Step.
  const shown = $derived(trace && atStep(trace, route.step));

  // A shared Live link carries its Prompt in the URL fragment (ADR 0002): once the server
  // is ready, it is run up to the shared Step in one request.
  if (route.mode === "live" && route.prompt) live.restore(route.prompt, route.step);

  // So does Back, Forward or a link that changes only the fragment, if the URL asks for a
  // Prompt or a Step the browser does not hold.
  $effect(() =>
    onHistoryMove(() => {
      const held = live.trace ? stepCount(live.trace) : 0;
      if (route.mode === "live" && route.prompt && (route.prompt !== live.prompt || route.step > held)) {
        live.restore(route.prompt, route.step);
      }
    }),
  );

  // In Live mode the URL carries the Prompt, so a link to the view reopens it.
  $effect(() => {
    if (liveMode && route.prompt !== live.prompt) navigate({ prompt: live.prompt }, { replace: true });
  });

  // Only Live mode calls the server: entering it checks the server, leaving it stops every call.
  $effect(() => {
    if (!liveMode) return;
    untrack(() => live.activate());
    return () => live.deactivate();
  });

  // A Live run holds only the Steps taken so far, and none once its Prompt is edited.
  // Restoring a shared Live link keeps its Step until the Steps arrive.
  $effect(() => {
    if (!liveMode || live.sharedStep !== undefined) return;
    const steps = live.trace ? stepCount(live.trace) : 0;
    if (route.step > steps) navigate({ step: steps }, { replace: true });
  });

  // Shows the run's last Step: Step 0, or a shared Live link's Step.
  async function runLive() {
    if ((await live.run()) && live.trace) navigate({ step: stepCount(live.trace) }, { replace: true });
  }

  // Shows the new Step, unless the user moved to another Step while it was on its way.
  async function advanceLive() {
    const from = route.step;
    if ((await live.advance()) && route.step === from) navigate({ step: from + 1 }, { replace: true });
  }

  $effect(() => {
    const id = route.example;
    let current = true;
    failed = false;
    loadExample(id).then(
      (loaded) => current && (exampleTrace = loaded),
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
      <LiveToggle />
      {#if liveMode}
        <LivePanel onrun={runLive} />
      {:else}
        <ExamplePicker />
      {/if}
      {#if trace}
        <StepControls
          steps={stepCount(trace)}
          {limit}
          endMessage={liveMode ? t("live.end", { steps: limit }) : t("step.end", { steps: limit })}
          onadvance={liveMode && live.status === "ready" ? advanceLive : undefined}
          advancing={liveMode && live.busy}
        />
      {/if}
      <PageLinks />
    </div>
    <PipelineStrip trace={shown} />
    {#if route.view === "architecture"}
      <!-- The architecture is the same for every Example and Step, so it needs no Trace. -->
      <ArchitectureView header={trace?.header} />
    {:else if route.view === "calculate"}
      <!-- The formulas are the same for every text, so they need no Trace either. -->
      <HowWeCalculateView />
    {:else if liveMode && !trace}
      <p class="empty">{t("live.empty")}</p>
    {:else if failed && !liveMode}
      <p role="alert">{t("view.loadError")}</p>
    {:else if !shown}
      <p role="status">{t("view.loading")}</p>
    {:else if route.view === "tokenize"}
      <TokenizationView trace={shown} />
    {:else if route.view === "embed"}
      <EmbeddingsView trace={shown} />
    {:else if route.view === "blocks"}
      <BlocksView trace={shown} />
    {:else if route.view === "attention"}
      <AttentionView trace={shown} />
    {:else if route.view === "predict"}
      <PredictionView trace={shown} canAdvance={route.step < limit} />
    {:else if route.view === "statistics"}
      <StatisticsView trace={shown} />
    {/if}
  </main>
</div>

<style>
  .page {
    max-width: 68rem;
    margin: 0 auto;
    padding: 0 1rem;
  }
  .empty {
    margin: 2rem 0 4rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  .bench {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.5rem;
    margin-top: 1.5rem;
  }
</style>
