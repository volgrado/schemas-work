import type { SRS } from '$lib/types';
import * as errorService from '$lib/core/services/errorService';
import * as cardService from '$lib/modules/study/domain/cardService';
import { toast } from 'svelte-sonner';
import { i18n } from '$lib/utils/i18n.svelte';


export type SaveStatus = 'idle' | 'saving' | 'saved';
export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface CardEditorState {
  isOpen: boolean;
  docId: string | null;
  cards: SRS.Card[];
  fetchStatus: FetchStatus;
  status: SaveStatus;
  lastAddedCardId: string | null;
}

const initialState: CardEditorState = {
  isOpen: false,
  docId: null,
  cards: [],
  fetchStatus: 'idle',
  status: 'idle',
  lastAddedCardId: null,
};

// This is now CORRECT because the file is named .svelte.ts
export const cardEditorState = $state<CardEditorState>({ ...initialState });

/**
 * Opens the card editor panel for a specific document and fetches its cards.
 */
export async function open(docId: string): Promise<void> {
  Object.assign(cardEditorState, initialState);
  cardEditorState.isOpen = true;
  cardEditorState.fetchStatus = 'loading';
  cardEditorState.docId = docId;

  try {
    const cards = await cardService.getCardsByDeckId(docId);
    cardEditorState.cards = cards;
    cardEditorState.fetchStatus = 'loaded';
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.open', docId });
    toast.error(i18n.t('card_editor.load_error'));
    cardEditorState.fetchStatus = 'error';
  }
}

/**
 * Closes the card editing panel and resets the store.
 */
export function close(): void {
  if (cardEditorState.isOpen) {
    Object.assign(cardEditorState, initialState);
  }
}

/**
 * Creates a new, empty card of a specified type.
 */
import { SRS_DEFAULTS } from '$lib/constants';

// ... imports

export async function addCard(type: SRS.CardType): Promise<void> {
  if (!cardEditorState.docId) return;

  cardEditorState.lastAddedCardId = null;

  const defaultSrs: SRS.Data = {
    easeFactor: SRS_DEFAULTS.EASE_FACTOR,
    interval: SRS_DEFAULTS.INTERVAL,
    repetitions: SRS_DEFAULTS.REPETITIONS,
    dueDate: Date.now(),
    learningStep: SRS_DEFAULTS.LEARNING_STEP,
  };

  let newCardData: Omit<SRS.Card, 'id' | 'deckId'>;
  switch (type) {
    case 'input':
      newCardData = {
        type: 'input',
        content: {
          prompt: i18n.t('card_editor.input_prompt_fallback'),
          expected: '',
        },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
    case 'sequencing':
      newCardData = {
        type: 'sequencing',
        content: {
          prompt: i18n.t('card_editor.sequencing_prompt'),
          items: ['Item 1', 'Item 2'],
        },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
    case 'basic':
    default:
      newCardData = {
        type: 'basic',
        content: { question: i18n.t('card_editor.new_question'), answer: '' },
        srs: defaultSrs,
        tags: [],
        suspended: false,
      };
      break;
  }

  try {
    const newCard = await cardService.addCard(
      cardEditorState.docId,
      newCardData as SRS.NewCard
    );
    cardEditorState.cards.push(newCard);
    cardEditorState.lastAddedCardId = newCard.id;
  } catch (err) {
    errorService.reportError(err, { operation: 'cardEditorStore.addCard' });
    toast.error(i18n.t('card_editor.create_error'));
  }
}

/**
 * Updates an existing card.
 */
export async function updateCard(updatedCard: SRS.Card): Promise<void> {
  cardEditorState.status = 'saving';

  const cardIndex = cardEditorState.cards.findIndex(
    (c) => c.id === updatedCard.id
  );
  if (cardIndex !== -1) {
    cardEditorState.cards[cardIndex] = updatedCard;
  } else {
    cardEditorState.cards.push(updatedCard);
  }

  try {
    await cardService.updateCard(updatedCard);
    setTimeout(() => {
      if (cardEditorState.status === 'saving') {
        cardEditorState.status = 'saved';
      }
    }, 1000);
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.updateCard',
      cardId: updatedCard.id,
    });
    toast.error(i18n.t('card_editor.save_error'));
    cardEditorState.status = 'idle';
  }
}

/**
 * Deletes a card.
 */
export async function deleteCard(
  cardId: string
): Promise<SRS.Card | undefined> {
  const cardIndex = cardEditorState.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return;

  const cardToDelete = cardEditorState.cards[cardIndex];
  cardEditorState.cards.splice(cardIndex, 1);

  try {
    await cardService.deleteCard(cardId);
    return cardToDelete;
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.deleteCard',
      cardId,
    });
    toast.error(i18n.t('card_editor.delete_error'));
    cardEditorState.cards.splice(cardIndex, 0, cardToDelete);
  }
}

/**
 * Restores a previously deleted card.
 */
export async function restoreCard(cardToRestore: SRS.Card): Promise<void> {
  try {
    await cardService.updateCard(cardToRestore);
    cardEditorState.cards.push(cardToRestore);
    cardEditorState.cards.sort(
      (a, b) => (a.srs?.dueDate || 0) - (b.srs?.dueDate || 0)
    );
  } catch (err) {
    errorService.reportError(err, {
      operation: 'cardEditorStore.restoreCard',
      cardId: cardToRestore.id,
    });
    toast.error(i18n.t('card_editor.restore_error'));
  }
}

/** Resets the `lastAddedCardId` state. */
export function clearLastAdded(): void {
  cardEditorState.lastAddedCardId = null;
}
