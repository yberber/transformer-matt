<script lang="ts">
  // The label every Estimate carries: theoretical, not measured, and a link to how it is calculated.
  import { navigate, route, routeUrl } from "../app/route.svelte";
  import { t } from "../i18n/i18n";
</script>

<a
  class="estimate"
  aria-label={t("estimate.linkName")}
  href={routeUrl({ ...route, view: "calculate" })}
  onclick={(event) => {
    event.preventDefault();
    navigate({ view: "calculate" });
  }}>{t("estimate.label")}</a
>

<style>
  .estimate {
    display: inline-block;
    padding: 0 0.35rem;
    border: 1px dashed var(--line);
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--line);
    text-decoration: none;
    white-space: nowrap;
  }
  .estimate:hover {
    border-style: solid;
  }
</style>
