// src/lib/stores/cardEditorStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from './editorStore';
import * as errorService from '$lib/services/core/errorService';

/**
 * Define la estructura del estado para el editor de tarjetas.
 */
export interface CardEditorState {
  isOpen: boolean;
  selectedNodePos: number | null; // La posición de inicio del `<li>` en el documento Tiptap.
  cards: DomainCard[]; // Una copia en memoria de las tarjetas que se están editando.
}

/**
 * El estado inicial del store cuando el panel está cerrado.
 */
const initialState: CardEditorState = {
  isOpen: false,
  selectedNodePos: null,
  cards: [],
};

// --- Creación del Store ---
const store = writable<CardEditorState>(initialState);
const { subscribe, update } = store;

// --- Acciones (La API pública de nuestro store) ---

/**
 * Abre el panel para editar las tarjetas de un nodo específico.
 * Es llamado por `DocumentView` cuando el usuario hace clic en un `listItem`.
 * @param {number} pos - La posición de inicio del nodo en el documento.
 * @param {DomainCard[]} cards - Las tarjetas actuales de ese nodo.
 */
function open(pos: number, cards: DomainCard[]) {
  update((state) => ({
    ...state,
    isOpen: true,
    selectedNodePos: pos,
    // ¡CRÍTICO! Creamos una copia profunda de las tarjetas. Esto desacopla el estado
    // del store del estado real del documento, permitiendo al usuario editar
    // libremente y solo guardar los cambios cuando esté listo.
    cards: cards.map((card) => ({ ...card })),
  }));
}

/**
 * Cierra el panel de edición y resetea el estado a sus valores iniciales.
 */
function close() {
  update((state) => {
    // Solo reseteamos si el panel ya está abierto para evitar renders innecesarios.
    if (state.isOpen) {
      return initialState;
    }
    return state;
  });
}

function prefillAndAddCard() {
  // *** 2. ENVOLVER EN try...catch ***
  try {
    const editor = get(editorStore).instance;
    const state = get(store);

    if (!editor || state.selectedNodePos === null) {
      // No es un error, simplemente no hay nada que hacer.
      return;
    }

    const node = editor.state.doc.nodeAt(state.selectedNodePos);

    // *** NUEVO: Comprobación explícita del nodo ***
    if (!node) {
      throw new Error(
        `Could not find node at position ${state.selectedNodePos} to prefill card.`
      );
    }

    let termText = '';
    let descriptionText = '';

    // Esta lógica de recorrer los hijos es segura,
    // pero la mantenemos dentro del try...catch por si acaso.
    node.forEach((childNode) => {
      if (childNode.attrs.role === 'term') {
        // Asumiendo que usamos roles
        termText = childNode.textContent;
      } else if (childNode.attrs.role === 'description') {
        descriptionText = childNode.textContent;
      }
    });

    const newCard: DomainCard = {
      q: descriptionText
        ? `¿Qué es "${termText}"?`
        : termText || 'Nueva Pregunta', // Añadir fallback
      a: descriptionText || '',
    };

    update((s) => {
      const newCards = [...s.cards, newCard];
      // Guardamos inmediatamente para que el usuario vea el cambio
      saveCardsToEditor(newCards);
      return { ...s, cards: newCards };
    });
  } catch (error) {
    const editorState = get(editorStore);
    errorService.reportError(error, {
      operation: 'prefillAndAddCard',
      selectedNodePos: editorState.selectedNodePos,
    });
    // Opcional: Notificar al usuario que algo falló.
    // toast.error('No se pudo autocompletar la tarjeta.');
  }
}

/**
 * Guarda las tarjetas (desde la copia local en el store) de vuelta en el
 * nodo de Tiptap correspondiente.
 */
function saveCardsToEditor(cardsToSave?: DomainCard[]) {
  const editor = get(editorStore).instance;
  const state = get(store);

  if (!editor || state.selectedNodePos === null) return;

  const cards = cardsToSave || state.cards; // Usar las tarjetas pasadas o las del estado

  editor
    .chain()
    .focus()
    .setNodeSelection(state.selectedNodePos)
    .setCards(cards)
    .run();
}

/**
 * Actualiza el array de tarjetas en el estado del store.
 * Esta función es llamada por la UI (`CardEditorPanel`) mientras el usuario edita,
 * típicamente en un evento `on:blur`.
 * @param {DomainCard[]} newCards - El nuevo array de tarjetas.
 */
function updateCardsInStore(newCards: DomainCard[]) {
  update((state) => ({ ...state, cards: newCards }));
}

// --- Exportación del Store Público ---
export const cardEditorStore = {
  subscribe,
  open,
  close,
  updateCardsInStore,
  saveCardsToEditor,
  prefillAndAddCard,
};
