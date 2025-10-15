// src/lib/stores/reviewStore.ts

import { writable, get } from 'svelte/store';
import type { Card, ReviewQuality } from '$lib/types';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
import type { Unsubscriber } from 'svelte/store';

/**
 * Represents the state of a review session.
 */
export interface ReviewState {
  isReviewing: boolean;
  cardsToReview: Card[];
  currentCardIndex: number;
  isAnswerShown: boolean;
  lastAnswerCorrect: boolean | null;
  decorationSet: DecorationSet;
}

const initialState: ReviewState = {
  isReviewing: false,
  cardsToReview: [],
  currentCardIndex: 0,
  isAnswerShown: false,
  lastAnswerCorrect: null,
  decorationSet: DecorationSet.empty,
};

const store = writable<ReviewState>(initialState);
const { subscribe, update, set } = store;

let unsubscribeFromEditor: Unsubscriber | null = null;
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
        // NOTE: This logic was causing the review to close instantly.
        // It's disabled for now to allow the immersive review mode to work.
        // A more sophisticated check might be needed if inline editing during review is desired.
        // console.warn('Document changed during review. Ending session.');
        // finishReview();
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

async function startReview() {
  const dueCards = await reviewService.getDueCards();

  if (dueCards.length > 0) {
    startReviewSession(dueCards, 'Scheduled Review');
    return;
  }

  toast.success('All reviewed for today!', {
    description:
      'Do you want to do an additional review with your most difficult cards?',
    action: {
      label: 'Review 5 cards',
      onClick: () => startAdditionalReview(),
    },
  });
}

async function startAdditionalReview() {
  const weakestCards = await reviewService.getWeakestCards(5);

  if (weakestCards.length === 0) {
    toast.info('There are no cards in this document for an additional review.');
    return;
  }

  startReviewSession(weakestCards, 'Additional Review');
}

function startReviewSession(cards: Card[], type: string) {
  toast.info(`${type} started with ${cards.length} cards.`);
  update((state) => ({
    ...state,
    isReviewing: true,
    cardsToReview: cards,
    currentCardIndex: 0,
    isAnswerShown: false,
    lastAnswerCorrect: null,
  }));
}

function showAnswer() {
  update((state) => ({ ...state, isAnswerShown: true }));
}

async function submitInteractiveAnswer(isCorrect: boolean) {
  update((s) => ({ ...s, isAnswerShown: true, lastAnswerCorrect: isCorrect }));
}

async function submitReview(quality: ReviewQuality) {
  const state = get(store);
  if (!state.isReviewing) return;

  const currentCard = state.cardsToReview[state.currentCardIndex];

  // CORRECCIÓN: calculateNextReview ahora maneja el objeto Card completo.
  const updatedCard = reviewService.calculateNextReview(currentCard, quality);

  // CORRECCIÓN: updatedCard ya es un objeto Card válido para ser guardado.
  await cardService.updateCard(updatedCard);

  let newCardsToReview = [...state.cardsToReview];
  const reviewedCard = newCardsToReview.splice(state.currentCardIndex, 1)[0];

  if (quality < 3) {
    newCardsToReview.push(reviewedCard);
    toast.info('This card will appear again in this session.');
  }

  if (
    newCardsToReview.length === 0 ||
    state.currentCardIndex >= newCardsToReview.length
  ) {
    toast.success('Review complete!', {
      description: `You have studied ${state.cardsToReview.length} cards.`,
    });
    finishReview();
  } else {
    update((s) => ({
      ...s,
      cardsToReview: newCardsToReview,
      isAnswerShown: false,
      lastAnswerCorrect: null,
    }));
  }
}

function finishReview() {
  set(initialState);
}

async function jumpToSource() {
  const state = get(store);
  const editor = get(editorStore).instance;
  const currentCard = state.cardsToReview[state.currentCardIndex];
  if (!editor || !currentCard) return;

  let foundPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.nodeId === currentCard.nodeId) {
      foundPos = pos;
      return false;
    }
    return true;
  });

  if (foundPos !== null) {
    // We need to tell the page to focus on this node.
    // A direct state update might be cleaner if we refactor page state.
    // For now, we can assume the page component listens for this.
    editorStore.update((s) => ({ ...s, selectedNodePos: foundPos }));
    // A slight delay ensures the view has time to switch before focusing.
    setTimeout(() => {
      editor.chain().focus().setNodeSelection(foundPos!).run();
    }, 100);
  }

  finishReview();
}

export const reviewStore = {
  subscribe,
  startReview,
  showAnswer,
  submitReview,
  finishReview,
  submitInteractiveAnswer,
  jumpToSource,
};
