<script lang="ts">
  // A technical term kept in English; activating it shows a short explanation in the reader's language.
  import { t } from "./i18n";
  import type { Term } from "./markup";

  let { term, text }: { term: Term; text: string } = $props();

  let open = $state(false);
  const id = $props.id();
</script>

<button type="button" class="term" lang="en" aria-expanded={open} aria-controls={id} onclick={() => (open = !open)}
  >{text}</button
><span class="explanation" {id} hidden={!open}>{` (${t(`term.${term}`)})`}</span>

<style>
  .term {
    padding: 0;
    border: none;
    border-bottom: 1px dotted currentColor;
    background: none;
    font: inherit;
    color: inherit;
    cursor: help;
  }
  .term[aria-expanded="true"] {
    border-bottom-style: solid;
  }
  .explanation {
    font-style: italic;
    color: var(--ink-secondary);
  }
</style>
