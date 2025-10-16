// src/lib/stores/cardEditorStore.ts

import { writable, get } from 'svelte/store';
import type { Card, CardType, SrsData } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';
import * as cardService from '$lib/services/features/cardService';
import { toast } from 'svelte-sonner';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Defines the save status of the editor.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Defines the data fetching status. // <-- AÑADIDO: Nuevo tipo de estado
 */
export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Defines the state structure for the card editor.
 */
export interface CardEditorState {
  isOpen: boolean;
  nodeId: string | null;
  cards: Card[];
  fetchStatus: FetchStatus; // <-- CAMBIO: Reemplaza a isLoading
  status: SaveStatus;
  lastAddedCardId: string | null; // For auto-focus/scroll
}

/**
 * The initial state of the store when the panel is closed.
 */
const initialState: CardEditorState = {
  isOpen: false,
  nodeId: null,
  cards: [],
  fetchStatus: 'idle', // <-- CAMBIO: Reemplaza a isLoading
  status: 'idle',
  lastAddedCardId: null,
};

// --- Store Creation ---
const store = writable<CardEditorState>(initialState);
const { subscribe, update, set } = store;

// --- Actions (The public API of our store) ---

/**
 * Opens the panel to edit the cards of a specific node.
 * It fetches the cards from the cardService.
 * @param {string} nodeId - The unique ID of the node.
 */
async function open(nodeId: string) {
  // Set loading state immediately
  update((state) => ({
    ...state,
    isOpen: true,
    fetchStatus: 'loading', // <-- CAMBIO
    nodeId: nodeId,
    cards: [],
    status: 'idle',
  }));

  try {
    const cards = await cardService.getCardsByNodeId(nodeId);
    update((state) => ({
      ...state,
      cards: cards,
      fetchStatus: 'loaded', // <-- CAMBIO
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.open',
      nodeId,
    });
    toast.error('Could not load cards for this node.');
    update((state) => ({ ...state, fetchStatus: 'error' })); // <-- CAMBIO
  }
}

/**
 * Closes the editing panel and resets the state to its initial values.
 */
function close() {
  // Esta función ya es correcta porque resetea al estado inicial actualizado.
  update((state) => {
    if (state.isOpen) {
      return initialState;
    }
    return state;
  });
}

/**
 * Creates a new, empty card of a specific type and adds it to the database.
 * @param {CardType} type - The type of card to create.
 */
async function addCard(type: CardType) {
  const state = get(store);
  if (!state.nodeId) return;

  // Reset last added card ID before creating a new one
  update((s) => ({ ...s, lastAddedCardId: null }));

  const editorState = get(editorStore);
  const node =
    editorState.instance && state.nodeId
      ? findNodeById(editorState.instance.state.doc, state.nodeId)
      : null;

  let newCardData: Omit<Card, 'id' | 'nodeId'>;

  const defaultSrs: SrsData = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(),
  };

  switch (type) {
    case 'input':
      newCardData = {
        type: 'input',
        content: {
          prompt: node?.textContent
            ? `Regarding "${node.textContent}", ...`
            : 'Fill in the blank',
          expected: '',
        },
        srs: defaultSrs,
      };
      break;
    case 'sequencing':
      newCardData = {
        type: 'sequencing',
        content: { prompt: 'Order the following items:', items: ['', ''] }, // Start with two empty items
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
    // Set the ID of the newly added card for the UI to react to
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
 * Updates an existing card in the store and persists it to the database.
 * @param {Card} updatedCard - The card with the new data.
 */
async function updateCard(updatedCard: Card) {
  update((s) => ({
    ...s,
    status: 'saving',
    cards: s.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
  }));

  try {
    await cardService.updateCard(updatedCard);
    // Use a timeout to show "Saved" for a moment
    setTimeout(() => {
      update((s) => (s.status === 'saving' ? { ...s, status: 'saved' } : s));
    }, 1000);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error('Failed to save card changes.');
    update((s) => ({ ...s, status: 'idle' }));
  }
}

/**
 * Deletes a card from the store and the database.
 * @param {string} cardId - The ID of the card to delete.
 * @returns {Promise<Card | undefined>} The deleted card data for potential undo action.
 */
async function deleteCard(cardId: string): Promise<Card | undefined> {
  const cardToDelete = get(store).cards.find((c) => c.id === cardId);
  if (!cardToDelete) return;

  // Optimistic UI update
  update((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== cardId) }));

  try {
    await cardService.deleteCard(cardId);
    return cardToDelete;
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error('Failed to delete the card.');
    // Rollback UI on failure
    update((s) => ({ ...s, cards: [...s.cards, cardToDelete] }));
  }
}

/**
 * Restores a deleted card. Used for the "Undo" action.
 * @param {Card} cardToRestore - The card object to add back.
 */
async function restoreCard(cardToRestore: Card) {
  try {
    // The `addCard` service method expects a specific type, so we recreate it.
    // A more robust service might have a dedicated `restore` or `addWithId` method.
    await cardService.updateCard(cardToRestore); // Using updateCard as a way to re-insert
    update((s) => ({ ...s, cards: [...s.cards, cardToRestore] }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.restoreCard',
      cardId: cardToRestore.id,
    });
    toast.error('Failed to restore the card.');
  }
}

// Helper to find a Tiptap node by our custom nodeId attribute
function findNodeById(
  doc: ProseMirrorNode | null,
  id: string
): ProseMirrorNode | null {
  if (!doc) return null;
  let foundNode: ProseMirrorNode | null = null;
  doc.descendants((node: ProseMirrorNode) => {
    if (node.attrs.nodeId === id) {
      foundNode = node;
      return false; // stop searching
    }
  });
  return foundNode;
}

// --- Public Store Export ---
export const cardEditorStore = {
  subscribe,
  open,
  close,
  addCard,
  updateCard,
  deleteCard,
  restoreCard,
  clearLastAdded: () => update((s) => ({ ...s, lastAddedCardId: null })),
};
