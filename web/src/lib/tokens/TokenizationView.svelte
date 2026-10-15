<script lang="ts">
  import type { Trace } from "../trace/decode";
  import { positionColor } from "./color";
  import { hex } from "./display";
  import TokenText from "./TokenText.svelte";

  let { trace }: { trace: Trace } = $props();
</script>

<section aria-labelledby="tokenize-heading">
  <h2 id="tokenize-heading">Tokenize</h2>
  <p class="lead">
    The model never sees letters or words: it splits the Prompt into tokens, and each token is a
    number.
  </p>

  <ol class="tokens" aria-label="Prompt tokens">
    {#each trace.positions as position, i (i)}
      <li class="token" style:--token-color={positionColor(i)}>
        <TokenText bytes={position.tokenBytes} />
      </li>
    {/each}
  </ol>

  <details>
    <summary>Show details</summary>
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th scope="col">Position</th><th scope="col">Token</th><th scope="col">Token ID</th><th scope="col">Bytes</th></tr>
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
  </details>
</section>

<style>
  .lead {
    max-width: 38rem;
  }
  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 1.5rem 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono);
  }
  .token {
    padding: 0.15rem 0.4rem;
    border-bottom: 3px solid var(--token-color);
    border-radius: 3px 3px 0 0;
    background: color-mix(in oklab, var(--token-color) 14%, var(--paper));
    white-space: pre;
  }
  details {
    margin-top: 1rem;
  }
  summary {
    cursor: pointer;
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
