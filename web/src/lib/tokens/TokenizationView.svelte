<script lang="ts">
  import Message from "../i18n/Message.svelte";
  import { formatPercent, t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import type { Trace } from "../trace/decode";
  import { positionColor } from "./color";
  import { hex } from "./display";
  import TokenSequence from "./TokenSequence.svelte";
  import TokenText from "./TokenText.svelte";

  let { trace }: { trace: Trace } = $props();
</script>

<ViewFrame view="tokenize">
  {#snippet lead()}<Message key="view.tokenize.lead" />{/snippet}

  <TokenSequence {trace} label={t("tokens.listLabel")} />
  <p class="hint">
    <span class="legend prompt">{t("tokens.prompt")}</span>
    {#if trace.positions.length > trace.promptLength}<span class="legend continuation">{t("tokens.continuation")}</span>{/if}
    {t("tokens.hint")}
  </p>

  {#snippet details()}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">{t("table.position")}</th>
            <th scope="col">{t("table.token")}</th>
            <th scope="col">{t("table.tokenId")}</th>
            <th scope="col">{t("table.bytes")}</th>
            <th scope="col">{t("table.prediction")}</th>
            <th scope="col">{t("table.probability")}</th>
          </tr>
        </thead>
        <tbody>
          {#each trace.positions as position, i (i)}
            {@const top = position.predictions[0]!}
            <tr>
              <td>{i}</td>
              <td class="token-cell" style:--token-color={positionColor(i)}><TokenText bytes={position.tokenBytes} /></td>
              <td>{position.tokenId}</td>
              <td>{hex(position.tokenBytes)}</td>
              <td class="prediction-cell"><TokenText bytes={top.tokenBytes} /></td>
              <td>{formatPercent(top.probability)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/snippet}
</ViewFrame>

<style>
  .hint {
    max-width: 40rem;
    margin: -0.75rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-secondary);
  }
  .legend {
    margin-right: 0.5rem;
    padding: 0 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
  .legend.prompt {
    border-bottom: 2px solid var(--ink-faint);
  }
  .legend.continuation {
    outline: 1px dotted var(--ink-faint);
    outline-offset: 1px;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    margin-top: 0.75rem;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }
  th {
    font-family: var(--font-prose);
    font-weight: 600;
    text-align: left;
  }
  th,
  td {
    padding: 0.25rem 0.75rem 0.25rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .token-cell {
    white-space: pre;
    box-shadow: inset 3px 0 0 var(--token-color);
    padding-left: 0.5rem;
  }
  .prediction-cell {
    white-space: pre;
  }
</style>
