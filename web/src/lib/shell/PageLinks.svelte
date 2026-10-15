<script lang="ts">
  // Links from the flow to the separate pages about the whole model, which sit outside the pipeline.
  import { navigate, route, routeUrl } from "../app/route.svelte";
  import { PAGES } from "../app/viewState";
  import { t } from "../i18n/i18n";
</script>

<nav class="pages" aria-label={t("pages.label")}>
  {#each PAGES as view (view)}
    <a
      class="control"
      href={routeUrl({ ...route, view })}
      aria-current={route.view === view ? "page" : undefined}
      onclick={(event) => {
        event.preventDefault();
        navigate({ view });
      }}>{t(`pages.${view}`)}</a
    >
  {/each}
</nav>

<style>
  .pages {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-left: auto;
  }
  a {
    color: var(--line);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  a[aria-current="page"] {
    border-color: var(--line);
    box-shadow: inset 0 0 0 1px var(--line);
  }
</style>
