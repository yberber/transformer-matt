<script lang="ts">
  // Copies the URL of the current view. Without the clipboard API (plain HTTP),
  // shows the URL in a pre-selected text field to copy by hand.
  import { tick } from "svelte";
  import { route, routeUrl } from "../app/route.svelte";
  import { t } from "../i18n/i18n";

  const url = $derived(routeUrl(route));
  let copied = $state(false);
  let fallback = $state(false);
  let button: HTMLButtonElement;
  let field = $state<HTMLInputElement>();
  let resetTimer: ReturnType<typeof setTimeout>;

  async function copy() {
    try {
      if (!window.isSecureContext || !navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      copied = true;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => (copied = false), 2500);
    } catch {
      fallback = true;
      await tick();
      field?.focus();
      field?.select();
    }
  }

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    fallback = false;
    button.focus();
  }
</script>

<button type="button" class="control" bind:this={button} onclick={copy}>
  <span aria-hidden="true">⧉</span>
  {t("share.copy")}
</button>
<span class="status" role="status">{copied ? t("share.copied") : ""}</span>

{#if fallback}
  <div class="fallback">
    <label>
      {t("share.fallbackLabel")}
      <input bind:this={field} type="text" readonly value={url} onkeydown={closeOnEscape} />
    </label>
    <span class="hint">{t("share.fallbackHint")}</span>
  </div>
{/if}

<style>
  .status {
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .fallback {
    flex-basis: 100%;
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
  }
  label {
    display: grid;
    gap: 0.2rem;
    color: var(--ink-secondary);
  }
  input {
    width: 100%;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper-raised);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  .hint {
    color: var(--ink-secondary);
  }
</style>
