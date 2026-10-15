<script lang="ts">
  // Chooses one of the six Examples, grouped short, medium and long. A new Example starts at Step 0.
  import { navigate, route } from "../app/route.svelte";
  import { t } from "../i18n/i18n";
  import { BANDS, EXAMPLES, type ExampleId } from "../trace/examples";
</script>

<label class="control">
  {t("example.label")}
  <select
    value={route.example}
    onchange={(event) => navigate({ example: event.currentTarget.value as ExampleId, step: 0 })}
  >
    {#each BANDS as band (band)}
      <optgroup label={t(`example.band.${band}`)}>
        {#each EXAMPLES.filter((example) => example.band === band) as example (example.id)}
          <option value={example.id} lang="en">{example.title}</option>
        {/each}
      </optgroup>
    {/each}
  </select>
</label>

<style>
  select {
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    padding: 0 0.1rem;
  }
  /* The surrounding .control pill draws the focus ring. */
  select:focus-visible {
    outline: none;
  }
</style>
