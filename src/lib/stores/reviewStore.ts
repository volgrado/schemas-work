/**
 * @file Manages the state and logic for the spaced repetition review feature.
 * @module reviewStore
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
	decorationSet: DecorationSet.empty
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
		startReviewSession(dueCards, 'Scheduled Review');
		return;
	}

	toast.success('All reviewed for today!', {
		description: 'Want to study your most difficult cards instead?',
		action: {
			label: 'Review 5 Cards',
			onClick: () => startAdditionalReview()
		}
	});
}

/**
 * Starts an additional review session with a specified number of the weakest cards.
 */
async function startAdditionalReview(): Promise<void> {
	const WEAKEST_CARDS_COUNT = 5;
	const weakestCards = await reviewService.getWeakestCards(WEAKEST_CARDS_COUNT);

	if (weakestCards.length === 0) {
		toast.info('No cards available for an additional review.');
		return;
	}

	startReviewSession(weakestCards, 'Additional Review');
}

/**
 * Initializes the store for a new review session.
 * @internal
 * @param cards The array of cards to be reviewed.
 * @param type A label for the type of review.
 */
function startReviewSession(cards: Card[], type: string): void {
	toast.info(`${type} started with ${cards.length} card(s).`);
	update((state) => ({
		...initialState,
		isReviewing: true,
		cardsToReview: cards
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
			lastAnswerCorrect: null
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
	jumpToSource
};
