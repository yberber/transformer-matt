<script lang="ts">
  // A message rendered as rich text, with its technical terms explainable.
  import { rich, type MessageKey } from "./i18n";
  import Term from "./Term.svelte";

  let { key, params = {} }: { key: MessageKey; params?: Record<string, string | number> } = $props();
</script>

{#each rich(key, params) as part, i (i)}{#if part.kind === "term"}<Term term={part.term} text={part.text} />{:else}{part.text}{/if}{/each}
