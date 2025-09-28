// src/lib/stores/reviewStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from '$lib/stores/editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Define la estructura del estado para el modo de repaso.
 */
export interface ReviewState {
  isReviewing: boolean;
  nodesToReview: { pos: number; node: ProseMirrorNode; cards: DomainCard[] }[];
  currentNodeIndex: number;
  isAnswerShown: boolean;
  decorationSet: DecorationSet;
}

/**
 * El estado inicial del store cuando no hay una sesión de repaso activa.
 */
const initialState: ReviewState = {
  isReviewing: false,
  nodesToReview: [],
  currentNodeIndex: 0,
  isAnswerShown: false,
  decorationSet: DecorationSet.empty,
};

// --- Creación del Store ---
const store = writable<ReviewState>(initialState);
const { subscribe, update, set } = store;

// Lógica de Sincronización con el Editor (de la corrección anterior)
let unsubscribeFromEditor: (() => void) | null = null;
editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) {
    unsubscribeFromEditor();
    unsubscribeFromEditor = null;
  }
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    const handleTransaction = () => {
      const state = get(store);
      if (state.isReviewing) {
        console.warn(
          'Se detectó un cambio en el documento durante el repaso. Finalizando sesión para evitar errores.'
        );
        finishReview();
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

// --- Acciones del Store ---

/**
 * Escanea el documento en busca de nodos con tarjetas y comienza la sesión de repaso.
 */
function startReview() {
  const editor = get(editorStore).instance;
  if (!editor) return;

  const nodesWithCards: ReviewState['nodesToReview'] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === 'listItem' &&
      node.attrs.cards &&
      node.attrs.cards.length > 0
    ) {
      nodesWithCards.push({ pos, node, cards: node.attrs.cards });
    }
  });

  if (nodesWithCards.length === 0) {
    // *** CORRECCIÓN ***: Reemplazamos 'alert' con 'console.log' para no bloquear la UI.
    console.log('No hay tarjetas de estudio en este documento para repasar.');
    return;
  }

  update((state) => ({
    ...state,
    isReviewing: true,
    nodesToReview: nodesWithCards,
    currentNodeIndex: 0,
    isAnswerShown: false,
  }));

  highlightCurrentNode();
}

/** Muestra la respuesta de la tarjeta actual. */
function showAnswer() {
  update((state) => ({ ...state, isAnswerShown: true }));
}

/** Avanza a la siguiente tarjeta en la cola de repaso. */
function nextCard() {
  const currentState = get(store);
  if (currentState.currentNodeIndex + 1 >= currentState.nodesToReview.length) {
    // *** CORRECCIÓN ***: Reemplazamos 'alert' con 'console.log'.
    console.log('¡Felicidades, has completado el repaso!');
    finishReview();
  } else {
    update((state) => ({
      ...state,
      currentNodeIndex: state.currentNodeIndex + 1,
      isAnswerShown: false,
    }));
    highlightCurrentNode();
  }
}

/** Finaliza la sesión de repaso y resetea el estado a sus valores iniciales. */
function finishReview() {
  set(initialState);
}

/**
 * Crea y aplica una "decoración" de ProseMirror para resaltar el nodo actual.
 */
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || !state.isReviewing) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }

  const currentNodeInfo = state.nodesToReview[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const decoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    {
      class: 'is-current-review-node',
    }
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [decoration]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

// --- API Pública del Store ---
export const reviewStore = {
  subscribe,
  startReview,
  showAnswer,
  nextCard,
  finishReview,
};
