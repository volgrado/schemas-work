// src/lib/stores/cardEditorStore.ts

import { writable, get } from 'svelte/store';
import type { Card, CardType, SrsData } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';
import * as cardService from '$lib/services/features/cardService';
import { toast } from 'svelte-sonner';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Defines the state structure for the card editor.
 */
export interface CardEditorState {
  isOpen: boolean;
  nodeId: string | null;
  cards: Card[];
  isLoading: boolean;
}

/**
 * The initial state of the store when the panel is closed.
 */
const initialState: CardEditorState = {
  isOpen: false,
  nodeId: null,
  cards: [],
  isLoading: false,
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
    isLoading: true,
    nodeId: nodeId,
    cards: [],
  }));

  try {
    const cards = await cardService.getCardsByNodeId(nodeId);
    update((state) => ({
      ...state,
      cards: cards,
      isLoading: false, // Finish loading
    }));
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.open',
      nodeId,
    });
    toast.error('Could not load cards for this node.');
    update((state) => ({ ...state, isLoading: false })); // Finish loading on error
  }
}

/**
 * Closes the editing panel and resets the state to its initial values.
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
 * Creates a new, empty card of a specific type and adds it to the database.
 * @param {CardType} type - The type of card to create.
 */
async function addCard(type: CardType) {
  const state = get(store);
  if (!state.nodeId) return;

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
          prompt: node?.textContent || 'New Input Card',
          expected: '',
        },
        srs: defaultSrs,
      };
      break;
    case 'sequencing':
      newCardData = {
        type: 'sequencing',
        content: { prompt: node?.textContent || 'Order the items:', items: [] },
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
    update((s) => ({ ...s, cards: [...s.cards, newCard] }));
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
  // Optimistic UI update
  update((s) => ({
    ...s,
    cards: s.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
  }));

  try {
    await cardService.updateCard(updatedCard);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error('Failed to save card changes.');
    // Optional: Implement rollback logic here if needed
  }
}

/**
 * Deletes a card from the store and the database.
 * @param {string} cardId - The ID of the card to delete.
 */
async function deleteCard(cardId: string) {
  // Optimistic UI update
  update((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== cardId) }));

  try {
    await cardService.deleteCard(cardId);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error('Failed to delete the card.');
    // Optional: Implement rollback logic here if needed
  }
}

// Helper to find a Tiptap node by our custom nodeId attribute
function findNodeById(
  doc: ProseMirrorNode,
  id: string
): ProseMirrorNode | null {
  let foundNode: ProseMirrorNode | null = null;
  doc.descendants((node: ProseMirrorNode, pos: number) => {
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
};
