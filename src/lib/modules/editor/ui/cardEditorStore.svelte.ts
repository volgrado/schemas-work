// src/lib/stores/cardEditorStore.svelte.ts
/**
 * @file cardEditorStore.svelte.ts
 * @module editor
 * @description
 * Manages the global state for the Card Editor functionality using Svelte 5 Runes.
 *
 * This store handles the lifecycle of the card editor panel, including:
 * - Opening and closing the panel for a specific document.
 * - Fetching, creating, updating, and deleting study cards.
 * - Tracking the loading and saving status of card operations.
 * - Providing optimistic UI updates for a snappy user experience.
 */

import type { SRS } from '$lib/types';
import * as errorService from '$lib/core/services/errorService';
import * as cardService from '$lib/modules/study/domain/cardService';
import { toast } from 'svelte-sonner';
import { i18n } from '$lib/utils/i18n.svelte';
import { SRS_DEFAULTS } from '$lib/constants';

/** Represents the visual state of the save indicator. */
export type SaveStatus = 'idle' | 'saving' | 'saved';

/** Represents the status of the initial data fetch. */
export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Defines the reactive state shape for the card editor.
 */
export interface CardEditorState {
  /** Whether the card editor panel is currently visible. */
  isOpen: boolean;
  /** The ID of the document (deck) whose cards are being edited. */
  docId: string | null;
  /** The list of cards currently loaded in the editor. */
  cards: SRS.Card[];
  /** The current status of the data fetching operation. */
  fetchStatus: FetchStatus;
  /** The current status of the save operation (for auto-save feedback). */
  status: SaveStatus;
  /** The ID of the most recently added card (used for auto-scrolling). */
  lastAddedCardId: string | null;
}

const initialState: CardEditorState = {
  isOpen: false,
  docId: null,
  cards: [],
  fetchStatus: 'idle',
  status: 'idle',
  lastAddedCardId: null,
};

/**
 * The reactive state object for the card editor.
 */
export const cardEditorState = $state<CardEditorState>({ ...initialState });

// --- Actions ---

/**
 * Opens the card editor panel for a specific document and initiates a data fetch.
 * @param docId - The ID of the document (deck) to edit.
 */
export async function open(docId: string): Promise<void> {
  // Reset state to initial clean slate before opening
  Object.assign(cardEditorState, initialState);

  cardEditorState.isOpen = true;
  cardEditorState.fetchStatus = 'loading';
  cardEditorState.docId = docId;

  try {
    const cards = await cardService.getCardsByDeckId(docId);
    cardEditorState.cards = cards;
    cardEditorState.fetchStatus = 'loaded';
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.open', docId });
    toast.error(i18n.t('card_editor.load_error'));
    cardEditorState.fetchStatus = 'error';
  }
}

/**
 * Closes the card editing panel and resets the store to its initial state.
 */
export function close(): void {
  if (cardEditorState.isOpen) {
    Object.assign(cardEditorState, initialState);
  }
}

/**
 * Creates a new, empty card of a specified type and adds it to the store and database.
 * @param type - The type of card to create.
 */
export async function addCard(type: SRS.CardType): Promise<void> {
  if (!cardEditorState.docId) return;

  cardEditorState.lastAddedCardId = null;

  const defaultSrs: SRS.Data = {
    easeFactor: SRS_DEFAULTS.EASE_FACTOR,
    interval: SRS_DEFAULTS.INTERVAL,
    repetitions: SRS_DEFAULTS.REPETITIONS,
    dueDate: Date.now(),
    learningStep: SRS_DEFAULTS.LEARNING_STEP,
  };

  // Factory logic for different card types
  let newCardData: Omit<SRS.Card, 'id' | 'deckId'>;
  switch (type) {
    case 'input':
      newCardData = {
        type: 'input',
        content: {
          prompt: i18n.t('card_editor.input_prompt_fallback'),
          expected: '',
        },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
    case 'sequencing':
      newCardData = {
        type: 'sequencing',
        content: {
          prompt: i18n.t('card_editor.sequencing_prompt'),
          items: ['Item 1', 'Item 2'],
        },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
    case 'basic':
    default:
      newCardData = {
        type: 'basic',
        content: { question: i18n.t('card_editor.new_question'), answer: '' },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
  }

  try {
    const newCard = await cardService.addCard(
      cardEditorState.docId,
      newCardData as SRS.NewCard
    );

    // Optimistic update
    cardEditorState.cards.push(newCard);
    cardEditorState.lastAddedCardId = newCard.id;
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.addCard' });
    toast.error(i18n.t('card_editor.create_error'));
  }
}

/**
 * Updates an existing card in the store and database.
 * Handles auto-save status indicators.
 * @param updatedCard - The full card object with updated values.
 */
export async function updateCard(updatedCard: SRS.Card): Promise<void> {
  cardEditorState.status = 'saving';

  // Optimistic update: Update local state immediately
  const cardIndex = cardEditorState.cards.findIndex(
    (c) => c.id === updatedCard.id
  );
  if (cardIndex !== -1) {
    cardEditorState.cards[cardIndex] = updatedCard;
  } else {
    // Edge case: Card was added but state wasn't synced yet
    cardEditorState.cards.push(updatedCard);
  }

  try {
    await cardService.updateCard(updatedCard);
    // Provide visual feedback
    setTimeout(() => {
      if (cardEditorState.status === 'saving') {
        cardEditorState.status = 'saved';
      }
    }, 1000);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error(i18n.t('card_editor.save_error'));
    cardEditorState.status = 'idle';
  }
}

/**
 * Deletes a card from the store and database.
 * @param cardId - The unique ID of the card to delete.
 * @returns {Promise<SRS.Card | undefined>} The deleted card object (useful for undo operations).
 */
export async function deleteCard(
  cardId: string
): Promise<SRS.Card | undefined> {
  const cardIndex = cardEditorState.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return;

  // Optimistic update
  const cardToDelete = cardEditorState.cards[cardIndex];
  cardEditorState.cards.splice(cardIndex, 1);

  try {
    await cardService.deleteCard(cardId);
    return cardToDelete;
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error(i18n.t('card_editor.delete_error'));
    // Rollback on error
    cardEditorState.cards.splice(cardIndex, 0, cardToDelete);
  }
}

/**
 * Restores a previously deleted card (Undo operation).
 * @param cardToRestore - The card object to re-insert.
 */
export async function restoreCard(cardToRestore: SRS.Card): Promise<void> {
  try {
    // Re-save the card to the database
    await cardService.updateCard(cardToRestore);

    // Update local state
    cardEditorState.cards.push(cardToRestore);
    // Maintain chronological sort order if possible, or simple append
    cardEditorState.cards.sort(
      (a, b) => (a.srs?.dueDate || 0) - (b.srs?.dueDate || 0)
    );
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.restoreCard',
      cardId: cardToRestore.id,
    });
    toast.error(i18n.t('card_editor.restore_error'));
  }
}

/**
 * Resets the `lastAddedCardId` state.
 * Should be called after the UI handles the scroll-to-new-card action.
 */
export function clearLastAdded(): void {
  cardEditorState.lastAddedCardId = null;
}
