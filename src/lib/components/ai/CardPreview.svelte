<!-- src/lib/components/ai/CardPreview.svelte -->
<script lang="ts">
  import type { SRS } from '$lib/types';
  type Card = SRS.Card;
  type NewCard = SRS.NewCard;
  import { fade } from 'svelte/transition';
  import { t } from '$lib/utils/i18n';

  type PreviewCard = Card | NewCard;

  // --- Props ---
  let { cards, loading = false } = $props<{
    cards: PreviewCard[];
    loading?: boolean;
  }>();

  // --- Keying for Svelte animations ---
  const cardKeys = new WeakMap<PreviewCard, string>();
  let keyCounter = 0;
  function getCardKey(card: PreviewCard) {
    if (!cardKeys.has(card)) {
      cardKeys.set(card, `card-key-${keyCounter++}`);
    }
    return cardKeys.get(card)!;
  }

  // --- Helpers ---
  function formatInputPrompt(prompt: string): string {
    return prompt.replace(
      /\{\{\.\.\.\}\}/g,
      '<span class="input-blank">_________</span>'
    );
  }
</script>

<div class="card-preview-container">
  <header class="preview-header">
    <span class="card-count"
      >{cards?.length ?? 0} {$t('card_workbench.cards_visible')}</span
    >
  </header>

  <div class="card-list">
    {#if loading}
      {#each { length: 3 } as _}
        <div class="card skeleton" in:fade></div>
      {/each}
    {:else if cards?.length > 0}
      {#each cards as card (getCardKey(card))}
        <div class="card" in:fade>
          <div class="card-header">
            <span class="card-type">{card.type}</span>
          </div>
          <div class="card-content">
            {#if card.type === 'basic'}
              <div class="field">
                <span class="field-label">Question</span>
                <p>{card.content.question}</p>
              </div>
              <div class="field">
                <span class="field-label">Answer</span>
                <p class="answer">{card.content.answer}</p>
              </div>
            {:else if card.type === 'input'}
              <div class="field">
                <span class="field-label">Prompt</span>
                <p>{@html formatInputPrompt(card.content.prompt)}</p>
              </div>
              <div class="field">
                <span class="field-label">Expected</span>
                <p class="answer">{card.content.expected}</p>
              </div>
            {:else if card.type === 'sequencing'}
              <div class="field">
                <span class="field-label">Instruction</span>
                <p>{card.content.prompt}</p>
              </div>
              <div class="field">
                <span class="field-label">Sequence</span>
                <ol class="sequence-list">
                  {#each card.content.items as item}<li>{item}</li>{/each}
                </ol>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .card-preview-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .preview-header {
    display: flex;
    justify-content: flex-end; /* Changed */
    align-items: center;
    padding: 0 0 var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .card-count {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }
  .card-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: var(--space-md) 2px 0 0; /* Adjusted padding */
  }
  .card {
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-md);
    transition: all 0.2s ease;
    padding: var(--space-xs) var(--space-md) var(--space-md) var(--space-md); /* Added padding */
    overflow: hidden;
  }
  .card-header {
    font-size: 0.8rem;
  }
  .card-type {
    font-family: var(--font-mono);
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    font-weight: 600;
  }
  .card-content {
    padding-top: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .field p {
    margin: 0;
    line-height: 1.6;
    font-size: 0.95rem;
  }
  .field .answer {
    background-color: var(--color-success-bg);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    color: var(--color-success-text);
    border: 1px solid var(--color-success-border);
    align-self: flex-start;
    max-width: 100%;
  }
  .sequence-list {
    margin: 0;
    padding-left: var(--space-lg);
  }
  .sequence-list li {
    margin-bottom: var(--space-xs);
  }
  :global(.input-blank) {
    font-family: var(--font-mono);
    color: var(--color-accent);
    font-weight: 600;
  }
  .skeleton {
    height: 150px;
    background-color: var(--color-gray-100);
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.6;
    }
  }
  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
  :global(.dark-theme) .preview-header {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .card {
    background-color: var(--color-background-dark);
    border-color: var(--color-border-dark);
  }
</style>
