// src/lib/services/features/cardService.ts
import { get } from 'svelte/store';
import { editorStore } from '$lib/stores/editorStore';
import { cardEditorStore } from '$lib/stores/cardEditorStore';
import type { DomainCard } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

/**
 * Creates a new card with pre-filled content based on the currently selected node in the editor,
 * and immediately adds it to the node's card list.
 *
 * This function encapsulates business logic that was previously in the `cardEditorStore`.
 * It reads from the `editorStore` to get the context (the selected node) and interacts
 * with the `cardEditorStore` to perform the final state update.
 *
 * @returns {void}
 */
export function prefillAndAddCard(): void {
  try {
    const editorState = get(editorStore);
    const cardEditorState = get(cardEditorStore);

    const { instance: editor, selectedNodePos } = editorState;

    // Pre-conditions: Ensure the editor is ready and a node is selected.
    if (!editor || selectedNodePos === null) {
      console.warn(
        '[cardService.prefillAndAddCard] Aborted: No editor instance or selected node.'
      );
      return;
    }

    const node = editor.state.doc.nodeAt(selectedNodePos);

    if (!node) {
      throw new Error(
        `Could not find node at position ${selectedNodePos} to prefill card.`
      );
    }

    // Business Logic: Extract term and description from the node's children.
    let termText = '';
    let descriptionText = '';

    node.forEach((childNode) => {
      if (childNode.attrs.role === 'term') {
        termText = childNode.textContent.trim();
      } else if (childNode.attrs.role === 'description') {
        descriptionText = childNode.textContent.trim();
      }
    });

    // Business Logic: Construct the new card with sensible defaults.
    const newCard: DomainCard = {
      q: descriptionText
        ? `¿Qué es "${termText}"?`
        : termText || 'Nueva Pregunta',
      a: descriptionText || '',
    };

    // Update Stage: Add the new card to the existing list.
    const updatedCards = [...cardEditorState.cards, newCard];

    // Commit Stage: Update the store and persist the changes to the editor.
    // We delegate the responsibility of updating the state and saving back
    // to the `cardEditorStore` itself.
    cardEditorStore.updateCardsInStore(updatedCards);
    cardEditorStore.saveCardsToEditor(); // Persist immediately.
  } catch (error) {
    // Error Handling: Report any errors that occur during the process.
    const editorState = get(editorStore);
    errorService.reportError(error, {
      operation: 'cardService.prefillAndAddCard',
      description: 'Failed to automatically generate and add a new card.',
      selectedNodePos: editorState.selectedNodePos,
    });
    // Depending on the desired UX, you might want to show a toast notification here.
    // e.g., toast.error('No se pudo autocompletar la tarjeta.');
  }
}
