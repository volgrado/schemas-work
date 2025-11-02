/**
 * @file Manages the state and logic for the spaced repetition review feature.
 * @module reviewStore
 */

import { writable, get } from 'svelte/store';
import { Decoration, DecorationSet } from 'prosemirror-view';
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
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Represents the complete state of a single review session.
 */
export interface ReviewState {
  isReviewing: boolean;
  isUiVisible: boolean;
  isFinished: boolean;
  cardsToReview: Card[];
  failedQueue: Card[];
  sessionCardCount: number;
  currentCardIndex: number;
  isAnswerShown: boolean;
  lastAnswerCorrect: boolean | null;
  sessionOptions: Omit<DeckOptions, 'deckId'>;
  /** The set of decorations to highlight the current card in the editor. */
  decorationSet: DecorationSet;
}

/**
 * The initial state of the review store.
 */
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

/**
 * Represents the location of a card's source node within the ProseMirror document.
 */
interface CardPosition {
  pos: number;
  node: ProseMirrorNode;
}

/**
 * Finds the ProseMirror heading node corresponding to a given card ID.
 *
 * @param cardId - The ID of the card to find. This ID must match the `nodeId` of the source heading.
 * @returns A `CardPosition` object if found, otherwise `null`.
 */
function findCardNode(cardId: string): CardPosition | null {
  const editor = get(editorStore).instance;
  if (!editor) return null;

  let position: CardPosition | null = null;

  // --- MIGRATION CHANGE: Search for `heading` nodes with a matching `nodeId`. ---
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.nodeId === cardId) {
      position = { pos, node };
      return false; // Stop searching once the node is found
    }
  });

  return position;
}

/**
 * Creates a decoration set to highlight the current review card's source heading in the editor.
 * @param state - The current review state.
 * @returns A DecorationSet containing the highlight, or an empty set if no highlight is needed.
 */
function createCardDecorations(state: ReviewState): DecorationSet {
  const editor = get(editorStore).instance;
  if (
    !state.isReviewing ||
    state.isFinished ||
    !editor ||
    !state.isUiVisible ||
    state.cardsToReview.length === 0
  ) {
    return DecorationSet.empty;
  }

  const currentCard = state.cardsToReview[state.currentCardIndex];
  if (!currentCard) {
    return DecorationSet.empty;
  }

  // Use the migrated findCardNode function.
  const cardPos = findCardNode(currentCard.id);

  if (cardPos) {
    const from = cardPos.pos;
    const to = from + cardPos.node.nodeSize;
    // --- MIGRATION IMPROVEMENT: Use a NodeDecoration for block-level elements. ---
    // This is more robust than an inline decoration for highlighting the entire heading.
    const decoration = Decoration.node(from, to, {
      class: 'is-current-review-node', // Use the class defined in app.css
    });
    return DecorationSet.create(editor.state.doc, [decoration]);
  }

  return DecorationSet.empty;
}

const store = writable<ReviewState>(initialState);
const { subscribe, update, set } = store;

// --- The rest of the file is unchanged as it deals with SRS logic, not document structure. ---

let unsubscribeFromEditor: Unsubscriber | null = null;
editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) {
    unsubscribeFromEditor();
    unsubscribeFromEditor = null;
  }
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    const handleTransaction = () => {
      // Logic here is unaffected by the migration.
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

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

function startReviewSession(
  cards: Card[],
  type: string,
  deckIds?: string[],
  options?: Omit<DeckOptions, 'deckId'>
): void {
  toast.info(
    get(t)('review.review_started_toast', { type, count: cards.length })
  );
  update((state) => {
    const newState: ReviewState = {
      ...initialState,
      isReviewing: true,
      isUiVisible: true,
      cardsToReview: cards,
      sessionCardCount: cards.length,
      sessionOptions: options || deckService.defaultDeckOptions,
      decorationSet: DecorationSet.empty,
    };
    newState.decorationSet = createCardDecorations(newState);
    return newState;
  });
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
    deckId: currentCard.deckId,
    reviewTime: Date.now(),
    quality,
    newEase: updatedCard.srs.easeFactor,
    newInterval: updatedCard.srs.interval,
    state: cardStateForLog,
  });

  let newCardsToReview = [...state.cardsToReview];
  let newFailedQueue = [...state.failedQueue];
  const reviewedCard = newCardsToReview.splice(state.currentCardIndex, 1)[0];

  if (quality < 3) {
    newFailedQueue.push(reviewedCard);
    toast.info(get(t)('review.card_will_reappear_toast'));
  }

  if (newCardsToReview.length === 0 && newFailedQueue.length > 0) {
    newCardsToReview = newFailedQueue.sort(() => Math.random() - 0.5);
    newFailedQueue = [];
  }

  if (newCardsToReview.length === 0) {
    update((s) => ({
      ...s,
      isFinished: true,
      decorationSet: DecorationSet.empty,
    }));
    toast.success(get(t)('review.review_complete_toast'), {
      description: get(t)('review.review_complete_description', {
        count: state.sessionCardCount,
      }),
    });
  } else {
    update((s) => {
      const newState: ReviewState = {
        ...s,
        cardsToReview: newCardsToReview,
        failedQueue: newFailedQueue,
        currentCardIndex: 0,
        isAnswerShown: false,
        lastAnswerCorrect: null,
        decorationSet: DecorationSet.empty,
      };
      newState.decorationSet = createCardDecorations(newState);
      return newState;
    });
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

  update((s) => ({
    ...s,
    isUiVisible: false,
    decorationSet: DecorationSet.empty,
  }));
}

function resumeReviewUi(): void {
  update((s) => {
    const newState = { ...s, isUiVisible: true };
    newState.decorationSet = createCardDecorations(newState);
    return newState;
  });
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
