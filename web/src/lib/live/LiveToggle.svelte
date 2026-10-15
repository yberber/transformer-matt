<script lang="ts">
  // Switches between Example mode and Live mode. Either way the run starts at Step 0.
  import { navigate, route } from "../app/route.svelte";
  import { t } from "../i18n/i18n";
</script>

<button
  type="button"
  class="control"
  aria-pressed={route.mode === "live"}
  onclick={() => navigate({ mode: route.mode === "live" ? "example" : "live", step: 0 })}
>
  <span class="lamp" aria-hidden="true"></span>
  {t("live.toggle")}
</button>

<style>
  /* A small indicator lamp, lit in Live mode. */
  .lamp {
    width: 0.55rem;
    height: 0.55rem;
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  [aria-pressed="true"] .lamp {
    background: var(--line);
    box-shadow: 0 0 6px color-mix(in oklab, var(--line) calc(var(--glow) * 100%), transparent);
  }
</style>
