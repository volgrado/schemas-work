/**
 * @file Manages the state and logic for the spaced repetition review feature.
 * @module reviewStore
 */

import { writable, get } from 'svelte/store';
import type { Card, ReviewQuality } from '$lib/types';
import type { DeckOptions } from '$lib/services/features/deckService';
import { editorStore } from './editorStore';
import { documentStore } from './documentStore';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
import * as deckService from '$lib/services/features/deckService';
import * as reviewLogService from '$lib/services/features/reviewLogService';
import type { Unsubscriber } from 'svelte/store';
import { t } from '$lib/utils/i18n';

/**
 * Represents the complete state of a single review session.
 */
export interface ReviewState {
  isReviewing: boolean;
  isUiVisible: boolean; // NEW: Controls if the review UI is shown
  isFinished: boolean; // NEW: Tracks session completion
  cardsToReview: Card[];
  failedQueue: Card[]; // NEW: Queue for cards marked "Again"
  sessionCardCount: number; // NEW: Total cards at session start
  currentCardIndex: number;
  isAnswerShown: boolean;
  lastAnswerCorrect: boolean | null;
  sessionOptions: Omit<DeckOptions, 'deckId'>;
}

/**
 * The initial state of the review store.
 */
const initialState: ReviewState = {
  isReviewing: false,
  isUiVisible: false, // NEW: Default to false
  isFinished: false,
  cardsToReview: [],
  failedQueue: [],
  sessionCardCount: 0,
  currentCardIndex: 0,
  isAnswerShown: false,
  lastAnswerCorrect: null,
  sessionOptions: deckService.defaultDeckOptions,
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
        // Editing the document no longer automatically ends the review session.
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

/**
 * Initiates a standard review session, fetching due cards and applying deck options.
 * @param [deckIds] - Optional array of deck IDs to limit the review scope.
 */
async function startReview(deckIds?: string[]): Promise<void> {
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

  // Anki-like order: learning cards first, then reviews, then new cards.
  const finalCards = [
    ...learningCards,
    ...limitedReviewCards.sort((a, b) => a.srs.interval - b.srs.interval),
    ...limitedNewCards,
  ];

  if (finalCards.length > 0) {
    startReviewSession(
      finalCards,
      get(t)('review.scheduled_review'),
      deckIds,
      options
    );
    return;
  }

  toast.success(get(t)('review.all_reviewed_toast'), {
    description: get(t)('review.all_reviewed_description'),
    action: {
      label: get(t)('review.review_weakest_button'),
      onClick: () => startAdditionalReview(deckIds),
    },
  });
}

/**
 * Initiates a "cram" session with the user's weakest cards.
 * @param [deckIds] - Optional array of deck IDs to scope the search for weakest cards.
 */
async function startAdditionalReview(deckIds?: string[]): Promise<void> {
  const WEAKEST_CARDS_COUNT = 5;
  const weakestCards = await reviewService.getWeakestCards(WEAKEST_CARDS_COUNT);

  if (weakestCards.length === 0) {
    toast.info(get(t)('review.no_cards_for_additional_review'));
    return;
  }

  const options = { deckId: 'default', ...deckService.defaultDeckOptions };
  startReviewSession(
    weakestCards,
    get(t)('review.additional_review'),
    deckIds,
    options
  );
}

/**
 * Initializes the store's state for a new review session.
 * @internal
 */
function startReviewSession(
  cards: Card[],
  type: string,
  deckIds?: string[],
  options?: Omit<DeckOptions, 'deckId'>
): void {
  toast.info(
    get(t)('review.review_started_toast', { type, count: cards.length })
  );
  update((state) => ({
    ...initialState,
    isReviewing: true,
    isUiVisible: true,
    cardsToReview: cards,
    sessionCardCount: cards.length,
    sessionOptions: options || deckService.defaultDeckOptions,
  }));
}

function showAnswer(): void {
  update((state) => ({ ...state, isAnswerShown: true }));
}

async function submitInteractiveAnswer(isCorrect: boolean): Promise<void> {
  update((s) => ({ ...s, isAnswerShown: true, lastAnswerCorrect: isCorrect }));
}

function getCardState(
  card: Card,
  quality: ReviewQuality
): reviewLogService.ReviewLog['state'] {
  const srs = card.srs;
  if (!srs || srs.learningStep > 0) {
    return quality < 3 ? 'relearn' : 'learn';
  }
  return quality < 3 ? 'relearn' : 'review';
}

async function submitReview(quality: ReviewQuality): Promise<void> {
  const state = get(store);
  if (!state.isReviewing || state.isFinished) return;

  const currentCard = state.cardsToReview[state.currentCardIndex];
  const cardStateForLog = getCardState(currentCard, quality);

  const updatedCard = await reviewService.calculateNextReview(
    currentCard,
    quality,
    state.sessionOptions
  );
  await cardService.updateCard(updatedCard);

  await reviewLogService.logReview({
    cardId: currentCard.id,
    deckId: currentCard.deckId, // FIX: Use deckId
    reviewTime: Date.now(),
    quality,
    newEase: updatedCard.srs.easeFactor,
    newInterval: updatedCard.srs.interval,
    state: cardStateForLog,
  });

  // Anki-style queue management
  let newCardsToReview = [...state.cardsToReview];
  let newFailedQueue = [...state.failedQueue];
  const reviewedCard = newCardsToReview.splice(state.currentCardIndex, 1)[0];

  if (quality < 3) {
    // "Again"
    newFailedQueue.push(reviewedCard);
    toast.info(get(t)('review.card_will_reappear_toast'));
  }

  // If main queue is empty, repopulate it with failed cards for this round
  if (newCardsToReview.length === 0 && newFailedQueue.length > 0) {
    newCardsToReview = newFailedQueue.sort(() => Math.random() - 0.5);
    newFailedQueue = [];
  }

  if (newCardsToReview.length === 0) {
    update((s) => ({ ...s, isFinished: true }));
  } else {
    update((s) => ({
      ...s,
      cardsToReview: newCardsToReview,
      failedQueue: newFailedQueue,
      currentCardIndex: 0, // Always go to the start of the new queue
      isAnswerShown: false,
      lastAnswerCorrect: null,
    }));
  }
}

function finishReview(): void {
  set(initialState);
}

async function jumpToSource(): Promise<void> {
  const state = get(store);
  const currentCard = state.cardsToReview[state.currentCardIndex];
  const currentDocId = get(documentStore).docId;

  if (!currentCard) return;

  if (currentCard.deckId !== currentDocId) {
    await documentStore.loadDocument(currentCard.deckId);
  }

  update((s) => ({ ...s, isUiVisible: false }));
}

function resumeReviewUi(): void {
  update((s) => ({ ...s, isUiVisible: true }));
}

export const reviewStore = {
  subscribe,
  startReview,
  showAnswer,
  submitReview,
  finishReview,
  submitInteractiveAnswer,
  jumpToSource,
  resumeReviewUi,
};
