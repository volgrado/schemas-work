/**
 * @file Manages the state and logic for the spaced repetition review feature using Svelte 5 Runes.
 * @module reviewStore
 */

import type { SRS } from '$lib/types';
import type { DeckOptions } from '$lib/modules/study/domain/deckService';

import { editorState } from '@modules/editor';
import { documentState, load as loadDocument, setFocusCommand } from '$lib/modules/editor/ui/documentStore.svelte';
import { toast } from 'svelte-sonner';
import * as deckService from '$lib/modules/study/domain/deckService';
import { ReviewSessionService } from '$lib/modules/study/domain/reviewSessionService';
import { i18n } from '$lib/utils/i18n.svelte';
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
  const session = await ReviewSessionService.initializeScheduledSession(deckIds);

  if (session) {
    startReviewSession(session.cards, session.type, session.options);
    return;
  }

  toast.success(i18n.t('review.all_reviewed_toast'), {
    description: i18n.t('review.all_reviewed_description'),
    action: {
      label: i18n.t('review.review_weakest_button'),
      onClick: () => startAdditionalReview(deckIds),
    },
  });
}

export async function startAdditionalReview(deckIds?: string[]): Promise<void> {
  const WEAKEST_CARDS_COUNT = 5;
  const session = await ReviewSessionService.initializeWeakestCardsSession(WEAKEST_CARDS_COUNT, deckIds);

  if (!session) {
    toast.info(i18n.t('review.no_cards_for_additional_review'));
    return;
  }

  startReviewSession(session.cards, session.type, session.options);
}

function startReviewSession(
  cards: SRS.Card[],
  type: string,
  options: Omit<DeckOptions, 'deckId'>
): void {
  toast.info(
    i18n.t('review.review_started_toast', {
      type,
      count: cards.length,
    })
  );

  Object.assign(reviewState, initialState);
  reviewState.isReviewing = true;
  reviewState.isUiVisible = true;
  reviewState.cardsToReview = cards;
  reviewState.sessionCardCount = cards.length;
  reviewState.sessionOptions = options;
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

export async function submitReview(quality: SRS.ReviewQuality): Promise<void> {
  if (!reviewState.isReviewing || reviewState.isFinished) return;

  const currentCard = reviewState.cardsToReview[reviewState.currentCardIndex];
  
  const result = await ReviewSessionService.processReview(
    currentCard,
    quality,
    reviewState.sessionOptions
  );

  let newCardsToReview = [...reviewState.cardsToReview];
  let newFailedQueue = [...reviewState.failedQueue];
  const reviewedCard = newCardsToReview.splice(
    reviewState.currentCardIndex,
    1
  )[0];

  if (result.shouldRequeue) {
    newFailedQueue.push(reviewedCard);
    toast.info(i18n.t('review.card_will_reappear_toast'));
  }

  if (newCardsToReview.length === 0 && newFailedQueue.length > 0) {
    newCardsToReview = newFailedQueue.sort(() => Math.random() - 0.5);
    newFailedQueue = [];
  }

  if (newCardsToReview.length === 0) {
    reviewState.isFinished = true;
    reviewState.decorationSet = DecorationSet.empty;
    toast.success(i18n.t('review.review_complete_toast'), {
      description: i18n.t('review.review_complete_description', {
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
  const currentDocId = documentState.docId;

  if (!currentCard) return;

  if (currentCard.deckId !== currentDocId) {
    await loadDocument(currentCard.deckId, currentCard.id);
  } else {
    setFocusCommand(currentCard.id);
  }

  reviewState.isUiVisible = false;
  reviewState.decorationSet = DecorationSet.empty;
}

export function resumeReviewUi(): void {
  reviewState.isUiVisible = true;
  reviewState.decorationSet = createCardDecorations();
}
