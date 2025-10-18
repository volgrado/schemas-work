/**
 * @file Manages the state and logic for the spaced repetition review feature.
 * @module reviewStore
 *
 * @remarks
 * This store encapsulates all the state and business logic required for running a spaced
 * repetition review session. It is the single source of truth for the entire review experience,
 * from fetching due cards to calculating the next review date and advancing the session.
 *
 * ### Architectural Role
 *
 * - **Feature State Controller**: Similar to `cardEditorStore`, this store manages the state
 *   for a major, self-contained application feature. It holds the queue of cards to review,
 *   the user's progress through the queue, and UI state like whether a card's answer is visible.
 *   This isolates the complexity of the review feature from the rest of the application.
 *
 * - **Orchestrator of Services**: The store uses `reviewService` to fetch the initial set of
 *   cards (either all due cards or a set of the weakest ones) and to perform the core SRS
 *   algorithm (`calculateNextReview`). It then uses `cardService` to persist the updated card
 *   data to the database. This is a great example of the store acting as a high-level
 *   coordinator, delegating specialized tasks to dedicated services.
 *
 * - **Session Management**: The store manages the concept of a "session". The `startReview`
 *   function initiates the session, loading the cards and setting `isReviewing` to true. The
 *   `submitReview` function advances the session, and `finishReview` or `jumpToSource` terminates
 *   it, resetting the store to its initial state. The UI (`ReviewPanel.svelte`) is a purely
 *   reactive component that just displays the state provided by this store.
 *
 * ### Interesting Design Patterns
 *
 * - **Dynamic Review Queue**: The `submitReview` function contains an interesting piece of logic.
 *   If a user rates their recall quality as poor (e.g., `quality < 3`), the card is not simply
 *   discarded from the session. Instead, it's re-queued at the end of the `cardsToReview` array.
 *   This ensures that the user gets another chance to practice the cards they are struggling
 *   with within the same review session, reinforcing learning.
 *
 * - **Decoupled Editor Interaction**: The `jumpToSource` function demonstrates how this store
 *   interacts with the `editorStore`. It doesn't have a direct dependency on the editor component.
 *   Instead, it gets the editor instance from the `editorStore`, finds the relevant node position,
 *   and then uses the editor's command chain to move the user's focus. It also updates the
 *   `editorStore.selectedNodePos`, which might cause other UI elements to react. Finally, it
 *   calls its own `finishReview` to clean up the review state.
 */

import { writable, get } from 'svelte/store';
import type { Card, ReviewQuality } from '$lib/types';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
import type { Unsubscriber } from 'svelte/store';
import { t } from '$lib/utils/i18n';

/**
 * Represents the complete state of a single review session.
 */
export interface ReviewState {
  /** Indicates whether a review session is currently active. */
  isReviewing: boolean;
  /** The queue of cards to be reviewed in the current session. */
  cardsToReview: Card[];
  /** The index of the currently displayed card in the `cardsToReview` array. */
  currentCardIndex: number;
  /** Determines whether the answer of the current card is visible. */
  isAnswerShown: boolean;
  /** For interactive cards, tracks if the last attempt was correct. */
  lastAnswerCorrect: boolean | null;
  /** A ProseMirror DecorationSet for highlighting the source node. */
  decorationSet: DecorationSet;
}

/**
 * The initial state of the review store.
 * @internal
 */
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
 * Starts a standard review session with all due cards.
 */
async function startReview(): Promise<void> {
  const dueCards = await reviewService.getDueCards();

  if (dueCards.length > 0) {
    startReviewSession(dueCards, get(t)('review.scheduled_review'));
    return;
  }

  toast.success(get(t)('review.all_reviewed_toast'), {
    description: get(t)('review.all_reviewed_description'),
    action: {
      label: get(t)('review.review_weakest_button'),
      onClick: () => startAdditionalReview(),
    },
  });
}

/**
 * Starts an additional review session with a specified number of the weakest cards.
 */
async function startAdditionalReview(): Promise<void> {
  const WEAKEST_CARDS_COUNT = 5;
  const weakestCards = await reviewService.getWeakestCards(WEAKEST_CARDS_COUNT);

  if (weakestCards.length === 0) {
    toast.info(get(t)('review.no_cards_for_additional_review'));
    return;
  }

  startReviewSession(weakestCards, get(t)('review.additional_review'));
}

/**
 * Initializes the store for a new review session.
 * @internal
 * @param cards The array of cards to be reviewed.
 * @param type A label for the type of review.
 */
function startReviewSession(cards: Card[], type: string): void {
  toast.info(
    get(t)('review.review_started_toast', { type, count: cards.length })
  );
  update((state) => ({
    ...initialState,
    isReviewing: true,
    cardsToReview: cards,
  }));
}

/**
 * Reveals the answer for the current card.
 */
function showAnswer(): void {
  update((state) => ({ ...state, isAnswerShown: true }));
}

/**
 * Records the result of an interactive card and reveals the answer.
 * @param isCorrect Whether the user's answer was correct.
 */
async function submitInteractiveAnswer(isCorrect: boolean): Promise<void> {
  update((s) => ({ ...s, isAnswerShown: true, lastAnswerCorrect: isCorrect }));
}

/**
 * Submits the user's quality assessment for the current card and advances the session.
 * @param quality The user's perceived quality of recall (0-5).
 */
async function submitReview(quality: ReviewQuality): Promise<void> {
  const state = get(store);
  if (!state.isReviewing) return;

  const currentCard = state.cardsToReview[state.currentCardIndex];
  const updatedCard = reviewService.calculateNextReview(currentCard, quality);
  await cardService.updateCard(updatedCard);

  let newCardsToReview = [...state.cardsToReview];
  const reviewedCard = newCardsToReview.splice(state.currentCardIndex, 1)[0];

  if (quality < 3) {
    newCardsToReview.push(reviewedCard);
    toast.info(get(t)('review.card_will_reappear_toast'));
  }

  if (
    newCardsToReview.length === 0 ||
    state.currentCardIndex >= newCardsToReview.length
  ) {
    toast.success(get(t)('review.review_complete_toast'), {
      description: get(t)('review.review_complete_description', {
        count: state.cardsToReview.length,
      }),
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

/**
 * Ends the current review session and resets the store.
 */
function finishReview(): void {
  set(initialState);
}

/**
 * Ends the review session and jumps the editor to the source node of the current card.
 */
async function jumpToSource(): Promise<void> {
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
    editorStore.update((s) => ({ ...s, selectedNodePos: foundPos }));

    setTimeout(() => {
      editor.chain().focus().setNodeSelection(foundPos!).run();
    }, 100);
  }

  finishReview();
}

/**
 * The public interface for the `reviewStore`.
 */
export const reviewStore = {
  /** Subscribes to changes in the review session state. */
  subscribe,
  /** Starts a new review session with all due cards. */
  startReview,
  /** Reveals the answer to the current card. */
  showAnswer,
  /** Submits a review quality score for the current card. */
  submitReview,
  /** Ends the current review session. */
  finishReview,
  /** Submits the result of an interactive card and shows the answer. */
  submitInteractiveAnswer,
  /** Ends the session and jumps to the source node of the current card. */
  jumpToSource,
};
