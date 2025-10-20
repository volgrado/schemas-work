<!-- src/lib/components/study/CardBrowser.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Card } from '$lib/types';
  import * as cardService from '$lib/services/features/cardService';
  import * as directoryService from '$lib/services/core/directoryService';
  import QuickCardEditorModal from './QuickCardEditorModal.svelte';
  import RelinkCardModal from './RelinkCardModal.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  type SortColumn = 'deck' | 'question' | 'due' | 'ease';

  // --- Component State ---
  let allCards = $state<Card[]>([]);
  let docTitleMap = $state<Map<string, string>>(new Map());

  // Modal state
  let selectedCardForEdit = $state<Card | null>(null);
  let selectedCardForRelink = $state<Card | null>(null);

  // Filter and sort state
  let filterText = $state('');
  let sortBy = $state<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: 'due',
    direction: 'asc',
  });

  // --- Data Fetching ---
  onMount(async () => {
    await refreshData();
  });

  async function refreshData() {
    const [cards, docs] = await Promise.all([
      cardService.getAllCards(),
      directoryService.getAllItems(),
    ]);
    allCards = cards;
    docTitleMap = new Map(docs.map((d) => [d.id, d.title]));
  }

  // --- Derived Data for Display ---
  let displayedCards: Card[] = [];

  $effect(() => {
    let filtered = allCards;

    // 1. Filter
    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      filtered = allCards.filter((card) => {
        const deckTitle = docTitleMap.get(card.nodeId)?.toLowerCase() || '';
        const question =
          ('prompt' in card.content
            ? card.content.prompt
            : card.content.question
          )?.toLowerCase() || '';
        let answer = '';
        if ('answer' in card.content) {
          answer = card.content.answer?.toLowerCase() || '';
        } else if ('expected' in card.content) {
          answer = card.content.expected?.toLowerCase() || '';
        }
        return (
          deckTitle.includes(lowerFilter) ||
          question.includes(lowerFilter) ||
          answer.includes(lowerFilter)
        );
      });
    }

    // 2. Sort
    displayedCards = [...filtered].sort((a, b) => {
      const dir = sortBy.direction === 'asc' ? 1 : -1;
      switch (sortBy.column) {
        case 'deck':
          return (
            (docTitleMap.get(a.nodeId) || '').localeCompare(
              docTitleMap.get(b.nodeId) || ''
            ) * dir
          );
        case 'question':
          const qA =
            'prompt' in a.content
              ? a.content.prompt || ''
              : a.content.question || '';
          const qB =
            'prompt' in b.content
              ? b.content.prompt || ''
              : b.content.question || '';
          return qA.localeCompare(qB) * dir;
        case 'ease':
          return (a.srs.easeFactor - b.srs.easeFactor) * dir;
        case 'due':
        default:
          return (a.srs.dueDate - b.srs.dueDate) * dir;
      }
    });
  });

  // --- Event Handlers ---

  function handleSort(column: SortColumn) {
    if (sortBy.column === column) {
      sortBy.direction = sortBy.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.column = column;
      sortBy.direction = 'asc';
    }
  }

  function formatDate(timestamp: number) {
    if (!timestamp) return 'New';
    if (timestamp < Date.now()) return 'Due';
    return new Date(timestamp).toLocaleDateString();
  }

  function handleOpenEditor(card: Card) {
    selectedCardForEdit = card;
  }

  function handleCloseEditor() {
    selectedCardForEdit = null;
  }

  function handleUpdateCard(updatedCard: Card) {
    const index = allCards.findIndex((c) => c.id === updatedCard.id);
    if (index !== -1) {
      allCards[index] = updatedCard;
      allCards = allCards; // Trigger reactivity
    }
  }

  function handleDeleteCard(deletedCardId: string) {
    allCards = allCards.filter((c) => c.id !== deletedCardId);
  }

  function handleChangeSource(card: Card) {
    selectedCardForEdit = null;
    selectedCardForRelink = card;
  }

  function handleCloseRelink() {
    selectedCardForRelink = null;
  }
</script>

<div class="card-browser">
  <div class="browser-controls">
    <Input
      type="text"
      placeholder="Filter cards by deck, question, or answer..."
      bind:value={filterText}
    />
  </div>

  <table>
    <thead>
      <tr>
        <th onclick={() => handleSort('deck')}>Deck</th>
        <th onclick={() => handleSort('question')}>Question</th>
        <th>Answer</th>
        <th onclick={() => handleSort('due')}>Due</th>
        <th onclick={() => handleSort('ease')}>Ease</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {#each displayedCards as card: Card (card.id)}
        <tr
          onclick={() => handleOpenEditor(card)}
          class="card-row"
          class:suspended={card.suspended}
        >
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

<!-- Render Modals Conditionally -->
{#if selectedCardForEdit}
  <QuickCardEditorModal
    card={selectedCardForEdit}
    onclose={handleCloseEditor}
    onupdate={handleUpdateCard}
    ondelete={handleDeleteCard}
    onchangeSource={handleChangeSource}
  />
{/if}

{#if selectedCardForRelink}
  <RelinkCardModal
    card={selectedCardForRelink}
    onclose={handleCloseRelink}
    onupdate={handleUpdateCard}
  />
{/if}

<style>
  .card-browser {
    overflow-x: auto;
  }
  .browser-controls {
    margin-bottom: var(--space-md);
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
    white-space: nowrap;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }
  th:hover {
    color: var(--color-accent);
  }
  .card-row {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .card-row:hover {
    background-color: var(--btn-hover-bg);
  }
  .card-row.suspended {
    opacity: 0.6;
    font-style: italic;
    background-color: var(--color-bg-secondary);
  }
</style>
