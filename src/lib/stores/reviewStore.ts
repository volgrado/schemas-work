// src/lib/stores/reviewStore.ts

import { writable, get } from 'svelte/store';
import type { DomainCard } from '$lib/types';
import { editorStore } from '$lib/stores/editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';

// ... (Interfaz, estado inicial, suscripción al editor, etc. sin cambios)
/**
 * Represents the state of a review session.
 */
export interface ReviewState {
  /** Indicates if a review session is currently active. */
  isReviewing: boolean;
  /** The list of document nodes to be reviewed. */
  nodesToReview: { pos: number; node: ProseMirrorNode; cards: DomainCard[] }[];
  /** The index of the current node being reviewed. */
  currentNodeIndex: number;
  /** Indicates if the answer for the current card is shown. */
  isAnswerShown: boolean;
  /** The set of decorations to highlight the current review node. */
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
        console.warn(
          'Document changed during review. Ending session.',
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

/**
 * Starts a review session.
 * It first looks for due cards. If none are found, it offers an additional
 * review with the most difficult cards.
 */
function startReview() {
  const editor = get(editorStore).instance;
  if (!editor) return;

  // --- Path A: Normal Review (Due Cards) ---
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
    // If we find due cards, start the normal session
    startReviewSession(dueNodes, 'Scheduled Review');
    return;
  }

  // --- Path B: Offer Additional Review ---
  toast.success('All reviewed for today!', {
    description:
      'Do you want to do an additional review with your most difficult cards?',
    action: {
      label: 'Review 5 cards',
      onClick: () => startAdditionalReview(),
    },
  });
}

/**
 * Starts an additional review session with the most difficult cards.
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
    toast.info('There are no cards in this document for an additional review.');
    return;
  }

  // We sort the cards by their ease factor, from lowest to highest.
  // Cards without an `easeFactor` (new) are considered medium difficulty (2.5).
  const sortedNodes = allNodesWithCards.sort((a, b) => {
    const easeA = a.cards[0].easeFactor ?? 2.5;
    const easeB = b.cards[0].easeFactor ?? 2.5;
    return easeA - easeB;
  });

  // We take the 5 most difficult (or fewer if there aren't that many)
  const weakestNodes = sortedNodes.slice(0, 5);

  startReviewSession(weakestNodes, 'Additional Review');
}

/**
 * Helper function that actually starts the review session in the UI.
 * @param {ReviewState['nodesToReview']} nodes - The list of nodes to review.
 * @param {string} type - The type of review, for user feedback.
 */
function startReviewSession(nodes: ReviewState['nodesToReview'], type: string) {
  toast.info(`${type} started with ${nodes.length} cards.`);
  update((state) => ({
    ...state,
    isReviewing: true,
    nodesToReview: nodes,
    currentNodeIndex: 0,
    isAnswerShown: false,
  }));
  highlightCurrentNode();
}

/**
 * Shows the answer for the current card.
 */
function showAnswer() {
  update((state) => ({ ...state, isAnswerShown: true }));
}

/**
 * Submits the user's quality assessment for the current card and moves to the next.
 * @param {0 | 3 | 5} quality - The user's rating of how well they knew the answer.
 */
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
    toast.info('This card will appear again in this session.');
  }
  if (
    newNodesToReview.length === 0 ||
    state.currentNodeIndex >= newNodesToReview.length
  ) {
    toast.success('Review complete!', {
      description: `You have studied ${state.nodesToReview.length} cards.`,
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

/**
 * Finishes the current review session and resets the store.
 */
function finishReview() {
  set(initialState);
}

/**
 * Highlights the current node being reviewed in the editor.
 */
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
    { class: 'is-current-review-node' },
  );
  update((s) => ({
    ...s,
    decorationSet: DecorationSet.create(editor.state.doc, [decoration]),
  }));
}

/**
 * The public API for the review store.
 */
export const reviewStore = {
  subscribe,
  startReview,
  showAnswer,
  submitReview,
  finishReview,
};
