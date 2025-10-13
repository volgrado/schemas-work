// src/lib/stores/cardEditorStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';

/**
 * Defines the state structure for the card editor.
 */
export interface CardEditorState {
  isOpen: boolean;
  selectedNodePos: number | null; // The starting position of the `<li>` in the Tiptap document.
  cards: DomainCard[]; // An in-memory copy of the cards being edited.
}

/**
 * The initial state of the store when the panel is closed.
 */
const initialState: CardEditorState = {
  isOpen: false,
  selectedNodePos: null,
  cards: [],
};

// --- Store Creation ---
const store = writable<CardEditorState>(initialState);
const { subscribe, update } = store;

// --- Actions (The public API of our store) ---

/**
 * Opens the panel to edit the cards of a specific node.
 * It is called by `DocumentView` when the user clicks on a `listItem`.
 * @param {number} pos - The starting position of the node in the document.
 * @param {DomainCard[]} cards - The current cards of that node.
 */
function open(pos: number, cards: DomainCard[]) {
  update((state) => ({
    ...state,
    isOpen: true,
    selectedNodePos: pos,
    // CRITICAL! We create a deep copy of the cards. This decouples the state
    // of the store from the actual state of the document, allowing the user to edit
    // freely and only save the changes when ready.
    cards: cards.map((card) => ({ ...card })),
  }));
}

/**
 * Closes the editing panel and resets the state to its initial values.
 */
function close() {
  update((state) => {
    // We only reset if the panel is already open to avoid unnecessary renders.
    if (state.isOpen) {
      return initialState;
    }
    return state;
  });
}

/**
 * Prefills a new card with content from the selected editor node and adds it to the list.
 * It extracts text from elements with 'term' and 'description' roles within the node.
 */
function prefillAndAddCard() {
  try {
    const editor = get(editorStore).instance;
    const state = get(store);

    if (!editor || state.selectedNodePos === null) {
      // Not an error, just nothing to do.
      return;
    }

    const node = editor.state.doc.nodeAt(state.selectedNodePos);

    if (!node) {
      throw new Error(
        `Could not find node at position ${state.selectedNodePos} to prefill card.`,
      );
    }

    let termText = '';
    let descriptionText = '';

    // This logic of iterating through the children is safe,
    // but we keep it inside the try...catch just in case.
    node.forEach((childNode) => {
      if (childNode.attrs.role === 'term') {
        // Assuming we use roles
        termText = childNode.textContent;
      } else if (childNode.attrs.role === 'description') {
        descriptionText = childNode.textContent;
      }
    });

    const newCard: DomainCard = {
      q: descriptionText
        ? `What is "${termText}"?`
        : termText || 'New Question', // Add fallback
      a: descriptionText || '',
    };

    update((s) => {
      const newCards = [...s.cards, newCard];
      // We save immediately so the user sees the change
      saveCardsToEditor(newCards);
      return { ...s, cards: newCards };
    });
  } catch (error) {
    const editorState = get(editorStore);
    errorService.reportError(error, {
      operation: 'prefillAndAddCard',
      selectedNodePos: editorState.selectedNodePos,
    });
    // Optional: Notify the user that something failed.
    // toast.error('Could not autocomplete the card.');
  }
}

/**
 * Saves the cards (from the local copy in the store) back to the
 * corresponding Tiptap node.
 * @param {DomainCard[]} [cardsToSave] - Optional array of cards to save. If not provided, cards from the store are used.
 */
function saveCardsToEditor(cardsToSave?: DomainCard[]) {
  const editor = get(editorStore).instance;
  const state = get(store);

  if (!editor || state.selectedNodePos === null) return;

  const cards = cardsToSave || state.cards; // Use the passed cards or the ones from the state

  editor
    .chain()
    .focus()
    .setNodeSelection(state.selectedNodePos)
    .setCards(cards)
    .run();
}

/**
 * Updates the array of cards in the store's state.
 * This function is called by the UI (`CardEditorPanel`) while the user edits,
 * typically on an `on:blur` event.
 * @param {DomainCard[]} newCards - The new array of cards.
 */
function updateCardsInStore(newCards: DomainCard[]) {
  update((state) => ({ ...state, cards: newCards }));
}

// --- Public Store Export ---
export const cardEditorStore = {
  subscribe,
  open,
  close,
  updateCardsInStore,
  saveCardsToEditor,
  prefillAndAddCard,
};
