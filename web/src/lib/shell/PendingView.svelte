<script lang="ts">
  // A stage whose view is not built yet: its one-sentence explanation, a way on to
  // the views it opens up, and the model config numbers that stage depends on
  // behind "Show details".
  import { navigate, route, routeUrl } from "../app/route.svelte";
  import type { View } from "../app/viewState";
  import Message from "../i18n/Message.svelte";
  import { formatNumber, t, type MessageKey } from "../i18n/i18n";
  import type { Trace } from "../trace/decode";
  import ViewFrame from "./ViewFrame.svelte";

  let { view, trace }: { view: Exclude<View, "tokenize" | "embed" | "predict" | "attention">; trace: Trace } = $props();

  const { header } = $derived(trace);
  const config = $derived(header.config);

  type ConfigName = keyof typeof config;
  type Row = { name: string; label: MessageKey; value: number };
  const row = (name: ConfigName): Row => ({ name, label: `config.${name}`, value: config[name] });
  const rows = $derived.by((): Row[] => {
    switch (view) {
      case "blocks":
        return [
          row("n_layer"),
          row("n_head"),
          { name: "n_embd / n_head", label: "config.head_dim", value: config.n_embd / config.n_head },
          row("n_embd"),
        ];
    }
  });
</script>

<ViewFrame {view}>
  {#snippet lead()}
    <Message
      key={`view.${view}.lead`}
      params={{ width: config.n_embd, layers: config.n_layer, vocabulary: config.vocab_size }}
    />
  {/snippet}

  <p class="pending">{t("view.pending")}</p>
  {#if view === "blocks"}
    <p>
      <a
        href={routeUrl({ ...route, view: "attention" })}
        onclick={(event) => {
          event.preventDefault();
          navigate({ view: "attention" });
        }}>{t("blocks.attentionLink")}</a
      >
    </p>
  {/if}

  {#snippet details()}
    <dl>
      {#each rows as row (row.name)}
        <div>
          <dt>{t(row.label)} <code>{row.name}</code></dt>
          <dd>{formatNumber(row.value)}</dd>
        </div>
      {/each}
    </dl>
    <p class="source">{t("view.configSource", { model: header.model_id, revision: header.model_revision })}</p>
  {/snippet}
</ViewFrame>

<style>
  .pending {
    max-width: 40rem;
    color: var(--ink-secondary);
  }
  dl {
    display: grid;
    gap: 0.25rem;
    max-width: 36rem;
    margin: 0.75rem 0 0;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.2rem 0;
    border-bottom: 1px solid var(--rule);
  }
  code {
    font-size: 0.8rem;
    color: var(--ink-secondary);
  }
  dd {
    margin: 0;
    font-family: var(--font-mono);
  }
  .source {
    font-size: 0.85rem;
    color: var(--ink-secondary);
    overflow-wrap: anywhere;
  }
</style>
