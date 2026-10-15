<script lang="ts">
  import { route } from "./lib/app/route.svelte";
  import { t } from "./lib/i18n/i18n";
  import Masthead from "./lib/shell/Masthead.svelte";
  import PendingView from "./lib/shell/PendingView.svelte";
  import PipelineStrip from "./lib/shell/PipelineStrip.svelte";
  import TokenizationView from "./lib/tokens/TokenizationView.svelte";
  import { loadExample, type Trace } from "./lib/trace/decode";

  let trace = $state<Trace>();
  let failed = $state(false);

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
  <PipelineStrip {trace} />
  <main>
    {#if failed}
      <p role="alert">{t("view.loadError")}</p>
    {:else if !trace}
      <p role="status">{t("view.loading")}</p>
    {:else if route.view === "tokenize"}
      <TokenizationView {trace} />
    {:else}
      <PendingView view={route.view} {trace} />
    {/if}
  </main>
</div>

<style>
  .page {
    max-width: 68rem;
    margin: 0 auto;
    padding: 0 1rem;
  }
</style>
