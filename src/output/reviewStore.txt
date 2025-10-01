// src/lib/stores/reviewStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from '$lib/stores/editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';

// ... (Interfaz, estado inicial, suscripción al editor, etc. sin cambios)
export interface ReviewState {
  isReviewing: boolean;
  nodesToReview: { pos: number; node: ProseMirrorNode; cards: DomainCard[] }[];
  currentNodeIndex: number;
  isAnswerShown: boolean;
  decorationSet: DecorationSet;
}
const initialState: ReviewState = {
  isReviewing: false,
  nodesToReview: [],
  currentNodeIndex: 0,
  isAnswerShown: false,
  decorationSet: DecorationSet.empty,
};
const store = writable<ReviewState>(initialState);
const { subscribe, update, set } = store;
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
        console.warn('Cambio en documento durante repaso. Finalizando sesión.');
        finishReview();
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

/**
 * Inicia una sesión de repaso.
 * Primero busca tarjetas pendientes. Si no hay, ofrece un repaso adicional
 * con las tarjetas más difíciles.
 */
function startReview() {
  const editor = get(editorStore).instance;
  if (!editor) return;

  // --- CAMINO A: Repaso Normal (Tarjetas Pendientes) ---
  const now = Date.now();
  const dueNodes: ReviewState['nodesToReview'] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === 'listItem' &&
      node.attrs.cards &&
      node.attrs.cards.length > 0
    ) {
      const card = node.attrs.cards[0];
      if (!card.dueDate || card.dueDate <= now) {
        dueNodes.push({ pos, node, cards: node.attrs.cards });
      }
    }
  });

  if (dueNodes.length > 0) {
    // Si encontramos tarjetas pendientes, iniciamos la sesión normal
    startReviewSession(dueNodes, 'Repaso Programado');
    return;
  }

  // --- CAMINO B: Ofrecer Repaso Adicional ---
  toast.success('¡Todo repasado por hoy!', {
    description:
      '¿Quieres hacer un repaso adicional con tus tarjetas más difíciles?',
    action: {
      label: 'Repasar 5 tarjetas',
      onClick: () => startAdditionalReview(),
    },
  });
}

/**
 * Inicia una sesión de repaso adicional con las tarjetas más difíciles.
 */
function startAdditionalReview() {
  const editor = get(editorStore).instance;
  if (!editor) return;

  const allNodesWithCards: ReviewState['nodesToReview'] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === 'listItem' &&
      node.attrs.cards &&
      node.attrs.cards.length > 0
    ) {
      allNodesWithCards.push({ pos, node, cards: node.attrs.cards });
    }
  });

  if (allNodesWithCards.length === 0) {
    toast.info('No hay tarjetas en este documento para un repaso adicional.');
    return;
  }

  // Ordenamos las tarjetas por su factor de facilidad (easeFactor), de menor a mayor.
  // Las tarjetas sin `easeFactor` (nuevas) se consideran de dificultad media (2.5).
  const sortedNodes = allNodesWithCards.sort((a, b) => {
    const easeA = a.cards[0].easeFactor ?? 2.5;
    const easeB = b.cards[0].easeFactor ?? 2.5;
    return easeA - easeB;
  });

  // Cogemos las 5 más difíciles (o menos si no hay tantas)
  const weakestNodes = sortedNodes.slice(0, 5);

  startReviewSession(weakestNodes, 'Repaso Adicional');
}

/**
 * Función auxiliar que realmente inicia la sesión de repaso en la UI.
 * @param nodes La lista de nodos a repasar.
 * @param type El tipo de repaso, para feedback al usuario.
 */
function startReviewSession(nodes: ReviewState['nodesToReview'], type: string) {
  toast.info(`${type} iniciado con ${nodes.length} tarjetas.`);
  update((state) => ({
    ...state,
    isReviewing: true,
    nodesToReview: nodes,
    currentNodeIndex: 0,
    isAnswerShown: false,
  }));
  highlightCurrentNode();
}

// --- El resto de las funciones (showAnswer, submitReview, etc.) no necesitan cambios ---
function showAnswer() {
  update((state) => ({ ...state, isAnswerShown: true }));
}
function submitReview(quality: 0 | 3 | 5) {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || !state.isReviewing) return;
  const currentNodeInfo = state.nodesToReview[state.currentNodeIndex];
  const currentCard = currentNodeInfo.cards[0];
  const updatedCard = reviewService.calculateNextReview(currentCard, quality);
  editor
    .chain()
    .focus()
    .setNodeSelection(currentNodeInfo.pos)
    .setCards([updatedCard])
    .run();
  let newNodesToReview = [...state.nodesToReview];
  const reviewedNode = newNodesToReview.splice(state.currentNodeIndex, 1)[0];
  if (quality < 3) {
    newNodesToReview.push(reviewedNode);
    toast.info('Esta tarjeta volverá a aparecer en esta sesión.');
  }
  if (
    newNodesToReview.length === 0 ||
    state.currentNodeIndex >= newNodesToReview.length
  ) {
    toast.success('¡Repaso completado!', {
      description: `Has estudiado ${state.nodesToReview.length} tarjetas.`,
    });
    finishReview();
  } else {
    update((s) => ({
      ...s,
      nodesToReview: newNodesToReview,
      isAnswerShown: false,
    }));
    highlightCurrentNode();
  }
}
function finishReview() {
  set(initialState);
}
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || !state.isReviewing) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }
  const currentNodeInfo = state.nodesToReview[state.currentNodeIndex];
  if (!currentNodeInfo) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }
  const decoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    { class: 'is-current-review-node' }
  );
  update((s) => ({
    ...s,
    decorationSet: DecorationSet.create(editor.state.doc, [decoration]),
  }));
}
export const reviewStore = {
  subscribe,
  startReview,
  showAnswer,
  submitReview,
  finishReview,
};
