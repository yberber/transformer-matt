<script lang="ts">
  import Message from "../i18n/Message.svelte";
  import { t } from "../i18n/i18n";
  import ViewFrame from "../shell/ViewFrame.svelte";
  import type { Trace } from "../trace/decode";
  import { positionColor } from "./color";
  import { hex } from "./display";
  import TokenText from "./TokenText.svelte";

  let { trace }: { trace: Trace } = $props();
</script>

<ViewFrame view="tokenize">
  {#snippet lead()}<Message key="view.tokenize.lead" />{/snippet}

  <ol class="tokens" aria-label={t("tokenize.listLabel")}>
    {#each trace.positions as position, i (i)}
      <li class="token chip" style:--token-color={positionColor(i)}>
        <TokenText bytes={position.tokenBytes} />
      </li>
    {/each}
  </ol>

  {#snippet details()}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">{t("table.position")}</th>
            <th scope="col">{t("table.token")}</th>
            <th scope="col">{t("table.tokenId")}</th>
            <th scope="col">{t("table.bytes")}</th>
          </tr>
        </thead>
        <tbody>
          {#each trace.positions as position, i (i)}
            <tr>
              <td>{i}</td>
              <td class="token-cell" style:--token-color={positionColor(i)}><TokenText bytes={position.tokenBytes} /></td>
              <td>{position.tokenId}</td>
              <td>{hex(position.tokenBytes)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/snippet}
</ViewFrame>

<style>
  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 1.5rem 0;
    padding: 0;
    list-style: none;
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
</style>
