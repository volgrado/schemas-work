/**
 * @file Manages the state, logic, and user interactions for the spaced repetition review feature.
 *
 * @remarks
 * This Svelte store orchestrates the entire user experience for a review session.
 * Its primary responsibilities include:
 * - **Session Initiation**: Fetching cards that are due for review using the `reviewService`.
 * - **Queue Management**: Handling the dynamic queue of cards to be reviewed, which includes
 *   re-queueing cards that are answered incorrectly for immediate reinforcement within the same session.
 * - **State Tracking**: Managing the state of the current card, such as whether the answer is
 *   currently visible to the user, and tracking the results of interactive card types.
 * - **User Interaction**: Processing user actions, such as submitting an answer quality score (`ReviewQuality`),
 *   and triggering the `reviewService` to calculate the next review interval based on the SM-2 algorithm.
 * - **Editor Coordination**: Interacting with the `editorStore` to highlight or jump to the source
 *   ProseMirror node associated with a given card, providing essential context to the user.
 * - **User Feedback**: Providing clear, non-intrusive feedback to the user via toast notifications.
 */

import { writable, get } from 'svelte/store';
import type { Card, ReviewQuality } from '$lib/types';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { toast } from 'svelte-sonner';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
import type { Unsubscriber } from 'svelte/store';

/**
 * Represents the complete state of a single review session.
 */
export interface ReviewState {
  /** Indicates whether a review session is currently active. */
  isReviewing: boolean;
  /** The queue of cards that remain to be reviewed in the current session. */
  cardsToReview: Card[];
  /** The index of the currently displayed card within the `cardsToReview` array. */
  currentCardIndex: number;
  /** Determines whether the answer (back side) of the current card is visible. */
  isAnswerShown: boolean;
  /** For interactive cards (e.g., input, sequencing), this tracks if the last attempt was correct. It is `null` for non-interactive cards. */
  lastAnswerCorrect: boolean | null;
  /** A ProseMirror DecorationSet, reserved for future functionality like highlighting the source node in the editor. */
  decorationSet: DecorationSet;
}

/**
 * The initial state of the review store, representing a time when no session is active.
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

// A subscription to the editor store to handle potential data conflicts or interactions.
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
        // This check is currently disabled to allow for an "immersive" review mode where the
        // user can edit the document without ending the review session. If this were enabled,
        // any change to the document would automatically call `finishReview()`.
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

/**
 * Starts a standard review session.
 *
 * @remarks
 * This function first fetches all cards that are currently due for review. If any are found,
 * it starts the session with those cards. If not, it displays a success message and prompts
 * the user with an option to start an additional, voluntary review of their weakest cards.
 */
async function startReview() {
  const dueCards = await reviewService.getDueCards();

  if (dueCards.length > 0) {
    startReviewSession(dueCards, 'Scheduled Review');
    return;
  }

  toast.success('All reviewed for today!', {
    description: 'Want to study your most difficult cards instead?',
    action: {
      label: 'Review 5 Cards',
      onClick: () => startAdditionalReview(),
    },
  });
}

/**
 * Starts an additional, optional review session with a specified number of the user's weakest cards.
 */
async function startAdditionalReview() {
  const WEAKEST_CARDS_COUNT = 5;
  const weakestCards = await reviewService.getWeakestCards(WEAKEST_CARDS_COUNT);

  if (weakestCards.length === 0) {
    toast.info('No cards available for an additional review.');
    return;
  }

  startReviewSession(weakestCards, 'Additional Review');
}

/**
 * Initializes the store's state for a new review session with a given set of cards.
 *
 * @param cards The array of `Card` objects to be reviewed in this session.
 * @param type A string label for the type of review (e.g., "Scheduled Review"), used for UI feedback.
 * @internal
 */
function startReviewSession(cards: Card[], type: string) {
  toast.info(`${type} started with ${cards.length} card(s).`);
  update((state) => ({
    ...initialState, // Reset state completely before starting
    isReviewing: true,
    cardsToReview: cards, // Assumes cards are pre-shuffled if desired
  }));
}

/**
 * Reveals the answer for the current card, changing its visibility state.
 */
function showAnswer() {
  update((state) => ({ ...state, isAnswerShown: true }));
}

/**
 * For interactive card types (e.g., sequencing), this records the result of the user's attempt
 * and then reveals the correct answer.
 *
 * @param isCorrect A boolean indicating whether the user's provided answer was correct.
 */
async function submitInteractiveAnswer(isCorrect: boolean) {
  update((s) => ({ ...s, isAnswerShown: true, lastAnswerCorrect: isCorrect }));
}

/**
 * Submits the user's quality assessment of their recall for the current card and advances the session.
 *
 * @remarks
 * This function performs several key steps:
 * 1. It calls the `reviewService` to calculate the card's next review date based on the provided `quality`.
 * 2. It then updates the card in the database via the `cardService`.
 * 3. If the quality was poor (less than 3), the card is re-queued at the end of the current session for immediate reinforcement.
 * 4. If the session is complete, it is finished; otherwise, it advances to the next card in the queue.
 *
 * @param quality The user's perceived quality of recall, on a scale from 0 to 5.
 */
async function submitReview(quality: ReviewQuality) {
  const state = get(store);
  if (!state.isReviewing) return;

  const currentCard = state.cardsToReview[state.currentCardIndex];
  const updatedCard = reviewService.calculateNextReview(currentCard, quality);
  await cardService.updateCard(updatedCard);

  let newCardsToReview = [...state.cardsToReview];
  const reviewedCard = newCardsToReview.splice(state.currentCardIndex, 1)[0];

  if (quality < 3) {
    newCardsToReview.push(reviewedCard); // Re-add the difficult card to the end of the queue
    toast.info('This card will appear again in this session.');
  }

  if (newCardsToReview.length === 0 || state.currentCardIndex >= newCardsToReview.length) {
    toast.success('Review complete!', { description: `You studied ${state.cardsToReview.length} cards.` });
    finishReview();
  } else {
    update((s) => ({
      ...s,
      cardsToReview: newCardsToReview,
      isAnswerShown: false,
      lastAnswerCorrect: null,
      // The currentCardIndex remains the same, as the next card shifts into its place in the array.
    }));
  }
}

/**
 * Ends the current review session and resets the entire store to its initial, inactive state.
 */
function finishReview() {
  set(initialState);
}

/**
 * Abruptly ends the review session and jumps the editor view to the source node of the current card.
 */
async function jumpToSource() {
  const state = get(store);
  const editor = get(editorStore).instance;
  const currentCard = state.cardsToReview[state.currentCardIndex];
  if (!editor || !currentCard) return;

  let foundPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.nodeId === currentCard.nodeId) {
      foundPos = pos;
      return false; // Stop searching once the node is found
    }
    return true;
  });

  if (foundPos !== null) {
    // We must update the selected node position in the global editor store so that other UI
    // elements (like the card editor panel) can react if needed.
    editorStore.update((s) => ({ ...s, selectedNodePos: foundPos }));

    // A brief delay ensures that the UI has time to react to the state change before focus is forcefully shifted.
    setTimeout(() => {
      editor.chain().focus().setNodeSelection(foundPos!).run();
    }, 100);
  }

  finishReview();
}

/**
 * The public interface for the `reviewStore`, exposing all actions available to UI components.
 */
export const reviewStore = {
  /** Subscribes to changes in the review session state. */
  subscribe,
  /** Starts a new, standard review session with all due cards. */
  startReview,
  /** Reveals the answer to the current card being reviewed. */
  showAnswer,
  /** Submits a review quality score (0-5) for the current card and advances the session. */
  submitReview,
  /** Ends the current review session. */
  finishReview,
  /** Submits the result of an interactive card (e.g., input or sequencing) and shows the answer. */
  submitInteractiveAnswer,
  /** Ends the session and jumps the editor view to the source node of the current card. */
  jumpToSource,
};
