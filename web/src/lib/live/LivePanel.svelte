<script lang="ts">
  // Live mode's bench: the server's state, the Prompt field with the server's own token
  // preview and an "n / 64" count, and Run. If the server is unavailable, says so with one
  // click back to Example mode.
  import { navigate } from "../app/route.svelte";
  import { t, tPlural, type MessageKey } from "../i18n/i18n";
  import { positionColor } from "../tokens/color";
  import TokenText from "../tokens/TokenText.svelte";
  import { MAX_CONTINUATION_TOKENS, MAX_PROMPT_TOKENS, type LiveErrorCode } from "./api";
  import { looksNonEnglish } from "./language";
  import { live, type ServerStatus } from "./session.svelte";

  let { onrun }: { onrun: () => void } = $props();

  const id = $props.id();
  const STATUS: Partial<Record<ServerStatus, MessageKey>> = {
    checking: "live.checking",
    warming: "live.warming",
    ready: "live.ready",
  };
  const ERROR: Partial<Record<LiveErrorCode, MessageKey>> = {
    prompt_too_long: "live.error.promptTooLong",
    continuation_too_long: "live.error.continuationTooLong",
    empty_prompt: "live.error.emptyPrompt",
  };
  const limits = { max: MAX_PROMPT_TOKENS, steps: MAX_CONTINUATION_TOKENS };

  const status = $derived(STATUS[live.status]);
  const count = $derived(live.preview?.count ?? 0);
  const canRun = $derived(live.status === "ready" && live.prompt.trim() !== "" && !live.tooLong && !live.busy);
  const nonEnglish = $derived(looksNonEnglish(live.prompt));
  const errorMessage = $derived.by(() => {
    if (live.error !== "rate_limited") return live.error && t(ERROR[live.error] ?? "live.error.failed", limits);
    return live.retryAfter === undefined
      ? t("live.error.rateLimitedMoment")
      : tPlural("live.error.rateLimited", live.retryAfter);
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (canRun) onrun();
  }
</script>

<section class="live" aria-label={t("live.label")}>
  <p class="status" role="status">
    {#if status}<span class="lamp {live.status}" aria-hidden="true"></span>{t(status)}{/if}
  </p>

  {#if live.status === "unavailable"}
    <div class="notice alert" role="alert">
      <p>{t("live.unavailable")}</p>
      <div class="actions">
        <button type="button" class="control" onclick={() => navigate({ mode: "example", step: 0 })}>
          {t("live.backToExamples")}
        </button>
        <button type="button" class="control" onclick={() => live.retry()}>{t("live.retry")}</button>
      </div>
    </div>
  {/if}

  <form onsubmit={submit}>
    <label for="{id}-prompt">{t("live.promptLabel")}</label>
    <p class="hint" id="{id}-hint">{t("live.promptHint")}</p>
    <textarea
      id="{id}-prompt"
      rows="3"
      lang="en"
      spellcheck="false"
      aria-describedby="{id}-hint {id}-count"
      value={live.prompt}
      oninput={(event) => live.setPrompt(event.currentTarget.value)}
    ></textarea>

    <div class="meta">
      <span class="count" class:over={live.tooLong} id="{id}-count"
        >{live.tooLong && !live.preview ? `> ${MAX_PROMPT_TOKENS}` : t("live.count", { n: count, max: MAX_PROMPT_TOKENS })}</span
      >
      <button type="submit" class="control run" disabled={!canRun} aria-describedby={live.tooLong ? `${id}-limit` : undefined}>
        {live.busy && !live.trace ? t("live.running") : t("live.run")}
      </button>
    </div>

    {#if live.tooLong}
      <p class="notice" id="{id}-limit">{t("live.error.promptTooLong", limits)}</p>
    {/if}
    {#if nonEnglish}
      <p class="notice warning">{t("live.nonEnglish")}</p>
    {/if}
    {#if errorMessage}
      <p class="notice alert" role="alert">{errorMessage}</p>
    {/if}

    {#if live.preview?.tokens.length}
      <ol class="preview" aria-label={t("live.previewLabel")}>
        {#each live.preview.tokens as token, i (i)}
          <li class="chip" style:--token-color={positionColor(i)}><TokenText bytes={token.tokenBytes} plain /></li>
        {/each}
      </ol>
    {/if}
  </form>
</section>

<style>
  /* A row of its own on the bench, below the Live mode toggle. */
  .live {
    flex-basis: 100%;
    display: grid;
    gap: 0.5rem;
  }
  .live > * {
    max-width: 44rem;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 1.5em;
    margin: 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .lamp {
    width: 0.55rem;
    height: 0.55rem;
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .lamp.ready {
    background: var(--line);
  }
  .lamp.warming {
    background: color-mix(in oklab, var(--line) 40%, transparent);
  }
  form {
    display: grid;
    gap: 0.4rem;
  }
  label {
    font-weight: 600;
  }
  .hint {
    margin: -0.3rem 0 0;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-secondary);
  }
  textarea {
    width: 100%;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--line-soft);
    border-radius: 4px;
    background: var(--paper-raised);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 0.95rem;
    line-height: 1.4;
    resize: vertical;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .count {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .count.over {
    color: var(--ink);
    font-weight: 600;
  }
  .run:not(:disabled) {
    border-color: var(--line);
    color: var(--line);
  }
  .run:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .notice {
    margin: 0;
    padding-left: 0.75rem;
    border-left: 3px solid var(--token-5);
    font-size: 0.9rem;
  }
  .notice.alert {
    border-left-color: var(--token-7);
  }
  .notice p {
    margin: 0 0 0.4rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }
</style>
