/**
 * @file Manages the state and logic for the spaced repetition review feature using Svelte 5 Runes.
 * @module reviewStore
 */

import { browser } from '$app/environment';
import type { SRS } from '$lib/types';
import type { DeckOptions } from '$lib/services/features/deckService';
import { get as getStoreValue } from 'svelte/store';
// --- VVVV CORRECTED IMPORTS VVVV ---
import { editorState } from './editorStore.svelte';
import { documentState, load as loadDocument } from './documentStore.svelte';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
import * as deckService from '$lib/services/features/deckService';
import * as reviewLogService from '$lib/services/features/reviewLogService';
import { t } from '$lib/utils/i18n';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface ReviewState {
  isReviewing: boolean;
  isUiVisible: boolean;
  isFinished: boolean;
  cardsToReview: SRS.Card[];
  failedQueue: SRS.Card[];
  sessionCardCount: number;
  currentCardIndex: number;
  isAnswerShown: boolean;
  lastAnswerCorrect: boolean | null;
  sessionOptions: Omit<DeckOptions, 'deckId'>;
  decorationSet: DecorationSet;
}

const initialState: ReviewState = {
  isReviewing: false,
  isUiVisible: false,
  isFinished: false,
  cardsToReview: [],
  failedQueue: [],
  sessionCardCount: 0,
  currentCardIndex: 0,
  isAnswerShown: false,
  lastAnswerCorrect: null,
  sessionOptions: deckService.defaultDeckOptions,
  decorationSet: DecorationSet.empty,
};

export const reviewState = $state<ReviewState>({ ...initialState });

// --- Internal Helper Functions ---

interface CardPosition {
  pos: number;
  node: ProseMirrorNode;
}

function findCardNode(cardId: string): CardPosition | null {
  const editor = editorState.instance;
  if (!editor) return null;

  let position: CardPosition | null = null;
  editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'heading' && node.attrs.nodeId === cardId) {
      position = { pos, node };
      return false;
    }
  });
  return position;
}

function createCardDecorations(): DecorationSet {
  const editor = editorState.instance;
  if (
    !reviewState.isReviewing ||
    reviewState.isFinished ||
    !editor ||
    !reviewState.isUiVisible ||
    reviewState.cardsToReview.length === 0
  ) {
    return DecorationSet.empty;
  }
  const currentCard = reviewState.cardsToReview[reviewState.currentCardIndex];
  if (!currentCard) return DecorationSet.empty;
  const cardPos = findCardNode(currentCard.id);
  if (cardPos) {
    const from = cardPos.pos;
    const to = from + cardPos.node.nodeSize;
    const decoration = Decoration.node(from, to, {
      class: 'is-current-review-node',
    });
    return DecorationSet.create(editor.state.doc, [decoration]);
  }
  return DecorationSet.empty;
}

/**
 * Initializes the review store's reactive listeners.
 */
export function initializeReviewStoreListeners(): void {
  $effect(() => {
    const editor = editorState.instance;
    if (editor) {
      const handleTransaction = () => {
        /* ... any logic needed on transaction ... */
      };
      editor.on('transaction', handleTransaction);

      return () => {
        editor.off('transaction', handleTransaction);
      };
    }
  });
}

// --- Public Action Functions ---

export async function startReview(deckIds?: string[]): Promise<void> {
  const options =
    deckIds && deckIds.length > 0
      ? await deckService.getDeckOptions(deckIds[0])
      : { deckId: 'default', ...deckService.defaultDeckOptions };

  let dueCards = await reviewService.getDueCards(deckIds);
  const newCards = dueCards.filter((c) => !c.srs || c.srs.repetitions === 0);
  const learningCards = dueCards.filter((c) => c.srs && c.srs.learningStep > 0);
  const reviewCards = dueCards.filter(
    (c) => c.srs && c.srs.repetitions > 0 && c.srs.learningStep === 0
  );
  const limitedNewCards = newCards.slice(0, options.maxNewCardsPerDay);
  const remainingReviewSlots =
    options.maxReviewsPerDay - limitedNewCards.length;
  const limitedReviewCards = reviewCards.slice(
    0,
    Math.max(0, remainingReviewSlots)
  );
  const finalCards: SRS.Card[] = [
    ...learningCards,
    ...limitedReviewCards.sort((a, b) => a.srs.interval - b.srs.interval),
    ...limitedNewCards,
  ];

  if (finalCards.length > 0) {
    startReviewSession(
      finalCards,
      getStoreValue(t)('review.scheduled_review'),
      deckIds,
      options
    );
    return;
  }

  toast.success(getStoreValue(t)('review.all_reviewed_toast'), {
    description: getStoreValue(t)('review.all_reviewed_description'),
    action: {
      label: getStoreValue(t)('review.review_weakest_button'),
      onClick: () => startAdditionalReview(deckIds),
    },
  });
}

export async function startAdditionalReview(deckIds?: string[]): Promise<void> {
  const WEAKEST_CARDS_COUNT = 5;
  const weakestCards = await reviewService.getWeakestCards(WEAKEST_CARDS_COUNT);

  if (weakestCards.length === 0) {
    toast.info(getStoreValue(t)('review.no_cards_for_additional_review'));
    return;
  }

  const options = { deckId: 'default', ...deckService.defaultDeckOptions };
  startReviewSession(
    weakestCards,
    getStoreValue(t)('review.additional_review'),
    deckIds,
    options
  );
}

function startReviewSession(
  cards: SRS.Card[],
  type: string,
  deckIds?: string[],
  options?: Omit<DeckOptions, 'deckId'>
): void {
  toast.info(
    getStoreValue(t)('review.review_started_toast', {
      type,
      count: cards.length,
    })
  );

  Object.assign(reviewState, initialState);
  reviewState.isReviewing = true;
  reviewState.isUiVisible = true;
  reviewState.cardsToReview = cards;
  reviewState.sessionCardCount = cards.length;
  reviewState.sessionOptions = options || deckService.defaultDeckOptions;
  reviewState.decorationSet = createCardDecorations();
}

export function showAnswer(): void {
  reviewState.isAnswerShown = true;
}

export async function submitInteractiveAnswer(
  isCorrect: boolean
): Promise<void> {
  reviewState.isAnswerShown = true;
  reviewState.lastAnswerCorrect = isCorrect;
}

function getCardState(
  card: SRS.Card,
  quality: SRS.ReviewQuality
): reviewLogService.ReviewLog['state'] {
  const srs = card.srs;
  if (!srs || srs.learningStep > 0) {
    return quality < 3 ? 'relearn' : 'learn';
  }
  return quality < 3 ? 'relearn' : 'review';
}

export async function submitReview(quality: SRS.ReviewQuality): Promise<void> {
  if (!reviewState.isReviewing || reviewState.isFinished) return;

  const currentCard = reviewState.cardsToReview[reviewState.currentCardIndex];
  const cardStateForLog = getCardState(currentCard, quality);

  const updatedCard = await reviewService.calculateNextReview(
    currentCard,
    quality,
    reviewState.sessionOptions
  );
  await cardService.updateCard(updatedCard);

  await reviewLogService.logReview({
    cardId: currentCard.id,
    deckId: currentCard.deckId,
    reviewTime: Date.now(),
    quality,
    newEase: updatedCard.srs.easeFactor,
    newInterval: updatedCard.srs.interval,
    state: cardStateForLog,
  });

  let newCardsToReview = [...reviewState.cardsToReview];
  let newFailedQueue = [...reviewState.failedQueue];
  const reviewedCard = newCardsToReview.splice(
    reviewState.currentCardIndex,
    1
  )[0];

  if (quality < 3) {
    newFailedQueue.push(reviewedCard);
    toast.info(getStoreValue(t)('review.card_will_reappear_toast'));
  }

  if (newCardsToReview.length === 0 && newFailedQueue.length > 0) {
    newCardsToReview = newFailedQueue.sort(() => Math.random() - 0.5);
    newFailedQueue = [];
  }

  if (newCardsToReview.length === 0) {
    reviewState.isFinished = true;
    reviewState.decorationSet = DecorationSet.empty;
    toast.success(getStoreValue(t)('review.review_complete_toast'), {
      description: getStoreValue(t)('review.review_complete_description', {
        count: reviewState.sessionCardCount,
      }),
    });
  } else {
    reviewState.cardsToReview = newCardsToReview;
    reviewState.failedQueue = newFailedQueue;
    reviewState.currentCardIndex = 0;
    reviewState.isAnswerShown = false;
    reviewState.lastAnswerCorrect = null;
    reviewState.decorationSet = createCardDecorations();
  }
}

export function finishReview(): void {
  Object.assign(reviewState, initialState);
}

export async function jumpToSource(): Promise<void> {
  const currentCard = reviewState.cardsToReview[reviewState.currentCardIndex];
  // VVVV CORRECTED STATE ACCESS VVVV
  const currentDocId = documentState.docId;

  if (!currentCard) return;

  if (currentCard.deckId !== currentDocId) {
    // VVVV CORRECTED METHOD CALL VVVV
    await loadDocument(currentCard.deckId, currentCard.id);
  }

  reviewState.isUiVisible = false;
  reviewState.decorationSet = DecorationSet.empty;
}

export function resumeReviewUi(): void {
  reviewState.isUiVisible = true;
  reviewState.decorationSet = createCardDecorations();
}
