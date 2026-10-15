<script lang="ts">
  import TokenizationView from "./lib/tokens/TokenizationView.svelte";
  import { loadExample } from "./lib/trace/decode";

  const example = loadExample("placeholder");
</script>

<main>
  <h1>Inside the Transformer</h1>
  <p>Watch GPT-2 small turn a piece of text into a continuation, step by step, with real numbers.</p>

  {#await example}
    <p role="status">Loading the Example…</p>
  {:then trace}
    <TokenizationView {trace} />
  {:catch error}
    <p role="alert">{error.message}</p>
  {/await}
</main>

<style>
  main {
    max-width: 60rem;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
</style>
