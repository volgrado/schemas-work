/**
 * @file Manages the state and interactions for the `CardEditorPanel` component.
 * @module cardEditorStore
 *
 * @remarks
 * This store is the central state management hub for the `CardEditorPanel`, which is the primary
 * interface for creating, viewing, and editing spaced repetition (SRS) cards. These cards are
 * directly associated with specific nodes (content blocks) within the main document editor.
 *
 * ### Architectural Role
 *
 * - **State Controller for a Feature**: This store encapsulates all the state related to the card
 *   editing feature. This includes not just the data (the cards themselves) but also the UI
 *   state, such as whether the panel is open (`isOpen`), data fetching status (`fetchStatus`),
 *   and save status (`status`). This is a classic example of centralizing state management
 *   for a complex, feature-specific component.
 *
 * - **Orchestrator of Services**: The store doesn't perform database operations directly.
 *   Instead, it orchestrates calls to the `cardService`, which handles the actual persistence
 *   logic. It also interacts with the `editorStore` to get contextual information about the
 *   ProseMirror node being annotated with cards. This separation of concerns makes the
 *   codebase easier to maintain and test.
 *
 * ### Design Patterns
 *
 * - **Optimistic Updates**: In functions like `updateCard` and `deleteCard`, the local Svelte
 *   store is updated *immediately* before the asynchronous database call is made. This provides
 *   a snappy user experience, as the UI reflects the change instantly. The code then handles
 *   potential errors from the async operation (e.g., by showing a toast notification and,
 *   in the case of deletion, reverting the change).
 *
 * - **Status Flags for UI Feedback**: The `fetchStatus` and `status` properties are crucial
 *   for providing clear feedback to the user. The UI can subscribe to this store and display
 *   loading spinners, error messages, or "Saved" indicators based on the values of these flags.
 */

import { writable, get } from 'svelte/store';
// MODIFIED: Import NewCard to assist with type assertion
import type { Card, CardType, SrsData, NewCard } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';
import * as cardService from '$lib/services/features/cardService';
import { toast } from 'svelte-sonner';
import { t } from '$lib/utils/i18n';

/**
 * Represents the save status of a card during an update operation.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Represents the data fetching status when loading cards for a node.
 */
export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Defines the complete state structure for the card editor Svelte store.
 */
export interface CardEditorState {
  /** Indicates whether the card editor panel is visible. */
  isOpen: boolean;
  /** The unique ID of the document being edited. */
  docId: string | null;
  /** The array of `Card` objects for the active `docId`. */
  cards: Card[];
  /** The current status of the initial card fetching operation. */
  fetchStatus: FetchStatus;
  /** The current save status for user feedback. */
  status: SaveStatus;
  /** The ID of the most recently added card, to allow the UI to focus it. */
  lastAddedCardId: string | null;
}

/**
 * The initial, default state for the store.
 * @internal
 */
const initialState: CardEditorState = {
  isOpen: false,
  docId: null,
  cards: [],
  fetchStatus: 'idle',
  status: 'idle',
  lastAddedCardId: null,
};

const store = writable<CardEditorState>(initialState);
const { subscribe, update, set } = store;

/**
 * Opens the card editor panel for a specific document and fetches its cards.
 * @param docId The unique identifier of the document for which to load cards.
 */
async function open(docId: string): Promise<void> {
  update((state) => ({
    ...initialState,
    isOpen: true,
    fetchStatus: 'loading',
    docId: docId,
  }));

  try {
    const cards = await cardService.getCardsByDeckId(docId);
    update((state) => ({
      ...state,
      cards: cards,
      fetchStatus: 'loaded',
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.open',
      docId,
    });
    toast.error(get(t)('card_editor.load_error'));
    update((state) => ({ ...state, fetchStatus: 'error' }));
  }
}

/**
 * Closes the card editing panel and resets the store to its initial state.
 */
function close(): void {
  update((state) => {
    if (state.isOpen) {
      return initialState;
    }
    return state;
  });
}

/**
 * Creates a new, empty card of a specified type and persists it to the database.
 * @param type The type of card to create (`basic`, `input`, or `sequencing`).
 */
async function addCard(type: CardType): Promise<void> {
  const state = get(store);
  if (!state.docId) return;

  update((s) => ({ ...s, lastAddedCardId: null }));

  const defaultSrs: SrsData = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(),
    learningStep: 1, // Start in learning phase
  };

  let newCardData: Omit<Card, 'id' | 'deckId'>;
  switch (type) {
    case 'input':
      newCardData = {
        type: 'input',
        content: {
          prompt: get(t)('card_editor.input_prompt_fallback'),
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
          prompt: get(t)('card_editor.sequencing_prompt'),
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
        content: {
          question: get(t)('card_editor.new_question'),
          answer: '',
        },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
  }

  try {
    // MODIFIED: Assert the type of newCardData to satisfy the service's requirement.
    const newCard = await cardService.addCard(
      state.docId,
      newCardData as NewCard
    );
    update((s) => ({
      ...s,
      cards: [...s.cards, newCard],
      lastAddedCardId: newCard.id,
    }));
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.addCard' });
    toast.error(get(t)('card_editor.create_error'));
  }
}

/**
 * Updates an existing card in the store and persists the change to the database.
 * @param updatedCard The card object with its new data.
 */
async function updateCard(updatedCard: Card): Promise<void> {
  update((s) => ({
    ...s,
    status: 'saving',
    cards: s.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
  }));

  try {
    await cardService.updateCard(updatedCard);
    setTimeout(() => {
      update((s) => (s.status === 'saving' ? { ...s, status: 'saved' } : s));
    }, 1000);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error(get(t)('card_editor.save_error'));
    update((s) => ({ ...s, status: 'idle' }));
  }
}

/**
 * Deletes a card from the store and the database.
 * @param cardId The unique ID of the card to delete.
 * @returns The data of the deleted card, useful for an "Undo" action.
 */
async function deleteCard(cardId: string): Promise<Card | undefined> {
  const cardToDelete = get(store).cards.find((c) => c.id === cardId);
  if (!cardToDelete) return;

  update((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== cardId) }));

  try {
    await cardService.deleteCard(cardId);
    return cardToDelete;
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error(get(t)('card_editor.delete_error'));
    update((s) => ({ ...s, cards: [...s.cards, cardToDelete] }));
  }
}

/**
 * Restores a previously deleted card.
 * @param cardToRestore The complete `Card` object to add back to the database and store.
 */
async function restoreCard(cardToRestore: Card): Promise<void> {
  try {
    await cardService.updateCard(cardToRestore);
    update((s) => ({
      ...s,
      cards: [...s.cards, cardToRestore].sort(
        (a, b) => (a.srs?.dueDate || 0) - (b.srs?.dueDate || 0)
      ),
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.restoreCard',
      cardId: cardToRestore.id,
    });
    toast.error(get(t)('card_editor.restore_error'));
  }
}

/**
 * The public interface for the `cardEditorStore`.
 */
export const cardEditorStore = {
  /** Subscribes to the store to receive updates on state changes. */
  subscribe,
  /** Opens the editor panel for a specified node ID and loads its cards. */
  open,
  /** Closes the editor panel and resets its state. */
  close,
  /** Creates and adds a new card to the current node. */
  addCard,
  /** Updates an existing card with new data. */
  updateCard,
  /** Deletes a card by its unique ID. */
  deleteCard,
  /** Restores a previously deleted card. */
  restoreCard,
  /** Resets the `lastAddedCardId` state. */
  clearLastAdded: () => update((s) => ({ ...s, lastAddedCardId: null })),
};
