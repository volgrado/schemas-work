<!-- src/lib/components/study/CardBrowser.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Card } from '$lib/types';
  import * as cardService from '$lib/services/features/cardService';
  import * as directoryService from '$lib/services/core/directoryService';

  let allCards = $state<Card[]>([]);
  let docTitleMap = $state<Map<string, string>>(new Map());

  onMount(async () => {
    const [cards, docs] = await Promise.all([
      cardService.getAllCards(),
      directoryService.getAllItems(),
    ]);
    allCards = cards;
    docTitleMap = new Map(docs.map((d) => [d.id, d.title]));
  });

  function formatDate(timestamp: number) {
    if (timestamp < Date.now()) return 'Due';
    return new Date(timestamp).toLocaleDateString();
  }

  // TODO: Implement Edit and Re-link Modals
  function editCard(card: Card) {
    alert(`Editing card: ${card.id}. \nImplement QuickCardEditorModal here.`);
  }
</script>

<div class="card-browser">
  <table>
    <thead>
      <tr>
        <th>Deck</th>
        <th>Question</th>
        <th>Answer</th>
        <th>Due</th>
        <th>Ease</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {#each allCards as card (card.id)}
        <tr on:click={() => editCard(card)} class="card-row">
          <td>{docTitleMap.get(card.nodeId) || 'Unknown'}</td>
          <td>
            {#if card.type === 'basic' || card.type === 'input' || card.type === 'sequencing'}
              {@const content = card.content as any}
              {content.prompt || content.question}
            {/if}
          </td>
          <td>
            {#if card.type === 'basic'}
              {card.content.answer}
            {:else if card.type === 'input'}
              {card.content.expected}
            {:else if card.type === 'sequencing'}
              {card.content.items.join(' -> ')}
            {/if}
          </td>
          <td>{formatDate(card.srs.dueDate)}</td>
          <td>{card.srs.easeFactor.toFixed(2)}</td>
          <td>{card.suspended ? 'Suspended' : 'Active'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .card-browser {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  th {
    font-weight: 600;
  }
  .card-row {
    cursor: pointer;
  }
  .card-row:hover {
    background-color: var(--btn-hover-bg);
  }
</style>
