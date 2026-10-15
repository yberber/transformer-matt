<script lang="ts">
  import { navigate, route } from "../app/route.svelte";
  import { LANGS, type Lang } from "../app/viewState";
  import { t } from "../i18n/i18n";

  // Each language is named in itself, so a reader can find their own.
  const NAMES: Record<Lang, string> = { en: "English", tr: "Türkçe", de: "Deutsch" };
</script>

<label class="control">
  {t("lang.label")}
  <select value={route.lang} onchange={(event) => navigate({ lang: event.currentTarget.value as Lang }, { replace: true })}>
    {#each LANGS as lang (lang)}
      <option value={lang} {lang}>{NAMES[lang]}</option>
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
