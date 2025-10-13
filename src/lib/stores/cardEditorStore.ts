// src/lib/stores/cardEditorStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from './editorStore';
// ✅ NUEVO: Importamos el servicio que contiene la lógica de negocio.
import * as cardService from '$lib/services/features/cardService';

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

/**
 * ✅ REFACTORIZADO: Esta función ahora actúa como un simple "despachador".
 * Toda la lógica de negocio compleja ha sido movida a `cardService.ts`.
 * El store ahora solo se preocupa de invocar el servicio correcto.
 */
function prefillAndAddCard() {
  // Simplemente llama a la función del servicio, que se encargará de todo.
  cardService.prefillAndAddCard();
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
