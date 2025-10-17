/**
 * @file Manages the complete state and all interactions for the `CardEditorPanel` component.
 *
 * @remarks
 * This Svelte store is designed as the single source of truth for the entire card editing UI.
 * It completely encapsulates the logic for:
 * - Opening and closing the panel and associating it with a specific document node.
 * - Asynchronously fetching existing card data from the `cardService` persistence layer.
 * - Performing all CRUD (Create, Read, Update, Delete) operations on cards.
 * - Handling UI-specific state, such as loading indicators, save feedback ("Saving...", "Saved"),
 *   and orchestrating complex interactions like "undo" functionality for deleted cards.
 *
 * As a central store, it plays a crucial role as an intermediary, effectively decoupling
 * the UI components (e.g., `CardEditorPanel.svelte`) from the underlying data services
 * (`cardService`). It also coordinates with other stores, such as `editorStore`, to
 * obtain contextual information, like the text content of the currently selected node,
 * to provide intelligent defaults for new cards.
 */

import { writable, get } from 'svelte/store';
import type { Card, CardType, SrsData } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';
import * as cardService from '$lib/services/features/cardService';
import { toast } from 'svelte-sonner';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Represents the save status of an individual card during an update operation, providing
 * visual feedback to the user.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Represents the data fetching status when initially loading a set of cards for a node.
 */
export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Defines the complete state structure for the card editor Svelte store.
 */
export interface CardEditorState {
  /** Indicates whether the card editor panel is currently visible to the user. */
  isOpen: boolean;
  /** The unique identifier of the ProseMirror node whose cards are being displayed and edited. */
  nodeId: string | null;
  /** The array of `Card` objects currently loaded into the editor for the active `nodeId`. */
  cards: Card[];
  /** The current status of the initial card fetching operation. */
  fetchStatus: FetchStatus;
  /** The current save status, used to provide user feedback (e.g., "Saving..."). */
  status: SaveStatus;
  /** Stores the ID of the most recently added card, allowing the UI to scroll to or focus it. */
  lastAddedCardId: string | null;
}

/**
 * The initial, default state for the store, representing a closed and idle panel.
 * @internal
 */
const initialState: CardEditorState = {
  isOpen: false,
  nodeId: null,
  cards: [],
  fetchStatus: 'idle',
  status: 'idle',
  lastAddedCardId: null,
};

const store = writable<CardEditorState>(initialState);
const { subscribe, update, set } = store;

/**
 * Opens the card editor panel to edit cards for a specific ProseMirror node.
 *
 * @remarks
 * This function triggers an asynchronous fetch of the relevant card data from `cardService`.
 * It immediately sets the panel to a "loading" state and then updates it with the
 * fetched cards once the request completes.
 *
 * @param nodeId The unique identifier of the node for which to load cards.
 */
async function open(nodeId: string) {
  update((state) => ({
    ...initialState, // Always reset to a clean slate before opening
    isOpen: true,
    fetchStatus: 'loading',
    nodeId: nodeId,
  }));

  try {
    const cards = await cardService.getCardsByNodeId(nodeId);
    update((state) => ({
      ...state,
      cards: cards,
      fetchStatus: 'loaded',
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.open',
      nodeId,
    });
    toast.error('Could not load cards for this node.');
    update((state) => ({ ...state, fetchStatus: 'error' }));
  }
}

/**
 * Closes the card editing panel and meticulously resets the store to its initial, clean state.
 */
function close() {
  update((state) => {
    if (state.isOpen) {
      return initialState;
    }
    return state;
  });
}

/**
 * Creates a new, empty card of a specified type and persists it to the database.
 *
 * @remarks
 * The new card is pre-populated with intelligent default content, often using the text of the
 * associated ProseMirror node as a prompt. The store is updated optimistically, and the UI is
 * notified of the newly added card's ID to enable focus or scrolling.
 *
 * @param type The type of card to create (`basic`, `input`, or `sequencing`).
 */
async function addCard(type: CardType) {
  const state = get(store);
  if (!state.nodeId) return;

  update((s) => ({ ...s, lastAddedCardId: null }));

  const editorState = get(editorStore);
  const node =
    editorState.instance && state.nodeId
      ? findNodeById(editorState.instance.state.doc, state.nodeId)
      : null;

  const defaultSrs: SrsData = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(), // Due immediately for first review
  };

  let newCardData: Omit<Card, 'id' | 'nodeId'>;
  switch (type) {
    case 'input':
      newCardData = {
        type: 'input',
        content: {
          prompt: node?.textContent
            ? `Regarding "${node.textContent}", what is the answer?`
            : 'Fill in the blank',
          expected: '',
        },
        srs: defaultSrs,
      };
      break;
    case 'sequencing':
      newCardData = {
        type: 'sequencing',
        content: { prompt: 'Order the following items:', items: ['Item 1', 'Item 2'] },
        srs: defaultSrs,
      };
      break;
    case 'basic':
    default:
      newCardData = {
        type: 'basic',
        content: { question: node?.textContent || 'New Question', answer: '' },
        srs: defaultSrs,
      };
      break;
  }

  try {
    const newCard = await cardService.addCard(state.nodeId, newCardData);
    update((s) => ({
      ...s,
      cards: [...s.cards, newCard],
      lastAddedCardId: newCard.id,
    }));
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.addCard' });
    toast.error('Failed to create the new card.');
  }
}

/**
 * Updates an existing card in the local store and persists the change to the database.
 *
 * @remarks
 * This function carefully manages the save status to provide clear user feedback (e.g., "Saving...", "Saved").
 * The status is updated optimistically to feel responsive.
 *
 * @param updatedCard The card object containing its new, updated data.
 */
async function updateCard(updatedCard: Card) {
  update((s) => ({
    ...s,
    status: 'saving',
    cards: s.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
  }));

  try {
    await cardService.updateCard(updatedCard);
    // Use a short delay before showing "Saved" to make the feedback feel less jarring and more deliberate.
    setTimeout(() => {
      update((s) => (s.status === 'saving' ? { ...s, status: 'saved' } : s));
    }, 1000);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error('Failed to save card changes.');
    update((s) => ({ ...s, status: 'idle' })); // Revert status on error
  }
}

/**
 * Deletes a card from both the store and the underlying database.
 *
 * @remarks
 * The UI is updated optimistically, meaning the card is removed from the view immediately.
 * If the database operation fails, the deletion is rolled back, and the card
 * is re-inserted into the store to maintain data consistency.
 *
 * @param cardId The unique identifier of the card to be deleted.
 * @returns A promise that resolves with the complete data of the deleted card, which is useful for an "Undo" action.
 */
async function deleteCard(cardId: string): Promise<Card | undefined> {
  const cardToDelete = get(store).cards.find((c) => c.id === cardId);
  if (!cardToDelete) return;

  // Optimistic UI update for a responsive feel
  update((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== cardId) }));

  try {
    await cardService.deleteCard(cardId);
    return cardToDelete; // Return the deleted data for a potential "Undo" operation
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error('Failed to delete the card.');
    // If the database operation fails, roll back the UI change.
    update((s) => ({ ...s, cards: [...s.cards, cardToDelete] }));
  }
}

/**
 * Restores a previously deleted card. This is designed to be used as part of an "Undo" action.
 *
 * @param cardToRestore The complete `Card` object that needs to be added back to the database and store.
 */
async function restoreCard(cardToRestore: Card) {
  try {
    // Use `updateCard` as it correctly handles re-inserting a card with a specific ID (an upsert operation).
    await cardService.updateCard(cardToRestore);
    update((s) => ({
      ...s,
      cards: [...s.cards, cardToRestore].sort((a, b) => (a.srs?.dueDate || 0) - (b.srs?.dueDate || 0)) // Maintain sort order
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.restoreCard',
      cardId: cardToRestore.id,
    });
    toast.error('Failed to restore the card.');
  }
}

/**
 * A helper utility to efficiently find a ProseMirror node by its custom `nodeId` attribute.
 *
 * @param doc The ProseMirror document node to search within.
 * @param id The `nodeId` to find.
 * @returns The found ProseMirror node, or `null` if it is not found.
 * @internal
 */
function findNodeById(
  doc: ProseMirrorNode | null,
  id: string
): ProseMirrorNode | null {
  if (!doc) return null;
  let foundNode: ProseMirrorNode | null = null;
  doc.descendants((node: ProseMirrorNode) => {
    if (node.attrs.nodeId === id) {
      foundNode = node;
      return false; // Stop traversal as soon as the node is found for efficiency
    }
  });
  return foundNode;
}

/**
 * The publicly exposed interface for the `cardEditorStore`, containing all actions and the `subscribe` method.
 */
export const cardEditorStore = {
  /** Subscribes to the store to receive updates whenever the state changes. */
  subscribe,
  /** Opens the editor panel for a specified node ID, loading its cards. */
  open,
  /** Closes the editor panel and resets its state to the initial default. */
  close,
  /** Creates and adds a new card of a given type to the current node. */
  addCard,
  /** Updates an existing card with new data. */
  updateCard,
  /** Deletes a card by its unique ID. */
  deleteCard,
  /** Restores a previously deleted card, intended for "Undo" functionality. */
  restoreCard,
  /** Resets the `lastAddedCardId` state, typically called after the UI has consumed it (e.g., after scrolling to the new card). */
  clearLastAdded: () => update((s) => ({ ...s, lastAddedCardId: null })),
};
