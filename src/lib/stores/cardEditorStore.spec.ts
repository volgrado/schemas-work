// src/lib/stores/cardEditorStore.spec.ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writable, get, type Subscriber } from 'svelte/store';
import type { Card, SrsData, NewCard } from '$lib/types';
import type { EditorStoreState } from './editorStore';
// ============================ FIX ============================
// Corrected the package name from 'pro-semirror-model' to 'prosemirror-model'
import type { Node as ProseMirrorNode } from 'prosemirror-model';
// =============================================================

// --- MOCK DEPENDENCIES ---
vi.mock('$lib/services/core/errorService', () => ({ reportError: vi.fn() }));
vi.mock('$lib/services/features/cardService', () => ({
  getCardsByNodeId: vi.fn(),
  addCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
}));

// Mock del editorStore dentro del factory
vi.mock('$lib/stores/editorStore', () => {
  const store = writable<Partial<EditorStoreState>>({});
  return { editorStore: store, __mockEditorStore: store };
});

// Mock del i18n
vi.mock('$lib/utils/i18n', () => {
  const tMock = vi.fn((key: string): string => key.split('.').pop() || '');
  return {
    t: {
      subscribe: (run: Subscriber<typeof tMock>) => {
        run(tMock);
        return () => {};
      },
      get: () => tMock,
    },
  };
});

// Mock de svelte-sonner dentro del factory
vi.mock('svelte-sonner', () => {
  const toastError = vi.fn();
  return { toast: { error: toastError }, __mockToastError: toastError };
});

// --- IMPORTS DESPUÉS DE MOCKS ---
import { cardEditorStore } from './cardEditorStore';
import * as cardService from '$lib/services/features/cardService';

// @ts-expect-error - __mockEditorStore is added by our vi.mock factory
import { editorStore, __mockEditorStore } from './editorStore';
// @ts-expect-error - __mockToastError is added by our vi.mock factory
import { __mockToastError } from 'svelte-sonner';

// --- TEST SETUP ---
describe('cardEditorStore', () => {
  const MOCK_NODE_ID = 'test-node-1';
  const MOCK_CARD_ID = 'card-1';
  const MOCK_SRS_DATA: SrsData = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(),
  };
  const MOCK_CARDS: Card[] = [
    {
      id: MOCK_CARD_ID,
      nodeId: MOCK_NODE_ID,
      type: 'basic',
      content: { question: 'Q1', answer: 'A1' },
      srs: MOCK_SRS_DATA,
    },
    {
      id: 'card-2',
      nodeId: MOCK_NODE_ID,
      type: 'input',
      content: { prompt: 'P1', expected: 'E1' },
      srs: MOCK_SRS_DATA,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Configurar mockEditorStore antes de cada test
    __mockEditorStore.set({
      doc: {
        descendants: (
          callback: (
            node: any,
            pos: number,
            parent: any | null,
            index: number
          ) => boolean | void
        ) => {
          const mockNode = {
            attrs: { nodeId: MOCK_NODE_ID },
            textContent: 'Node Content',
          };
          callback(mockNode, 0, null, 0);
        },
      } as unknown as ProseMirrorNode,
    });

    vi.mocked(cardService.getCardsByNodeId).mockResolvedValue([...MOCK_CARDS]);
    vi.mocked(cardService.addCard).mockImplementation(
      (nodeId: string, newCard: NewCard) =>
        Promise.resolve({
          ...newCard,
          nodeId,
          id: 'new-card-id-mock',
          srs: MOCK_SRS_DATA,
        } as Card)
    );
    vi.mocked(cardService.updateCard).mockResolvedValue(undefined);
    vi.mocked(cardService.deleteCard).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    cardEditorStore.close();
  });

  describe('open/close', () => {
    it('should populate cards on successful fetch', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      const state = get(cardEditorStore);
      expect(cardService.getCardsByNodeId).toHaveBeenCalledWith(MOCK_NODE_ID);
      expect(state.fetchStatus).toBe('loaded');
      expect(state.cards).toEqual(MOCK_CARDS);
    });

    it('should set fetchStatus=error on fetch failure', async () => {
      vi.mocked(cardService.getCardsByNodeId).mockRejectedValue(
        new Error('Fetch failed')
      );
      await cardEditorStore.open(MOCK_NODE_ID);
      expect(get(cardEditorStore).fetchStatus).toBe('error');
      expect(__mockToastError).toHaveBeenCalledWith('load_error');
    });
  });

  describe('addCard', () => {
    it('should add a BASIC card, deriving its question from node text', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      await cardEditorStore.addCard('basic');

      const addedCardData = vi.mocked(cardService.addCard).mock.calls[0][1];

      expect(
        get(cardEditorStore).cards.some((c) => c.id === 'new-card-id-mock')
      ).toBe(true);
      if (addedCardData.type === 'basic') {
        expect(addedCardData.content.question).toBe('Node Content');
      } else {
        expect.fail('Expected card type to be "basic"');
      }
    });
  });

  describe('updateCard', () => {
    const updatedCard: Card = {
      ...MOCK_CARDS[0],
      type: 'basic',
      content: { question: 'UPDATED Q', answer: 'A1' },
    };

    it('should optimistically update local state and set status to "saving"', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      cardEditorStore.updateCard(updatedCard);
      const state = get(cardEditorStore);

      expect(state.status).toBe('saving');
      const cardInStore = state.cards.find((c) => c.id === updatedCard.id);
      expect(cardInStore?.type).toBe('basic');
      if (cardInStore?.type === 'basic') {
        expect(cardInStore.content.question).toBe('UPDATED Q');
      }
      expect(cardService.updateCard).toHaveBeenCalledWith(updatedCard);
    });

    it('should set status to "saved" after a delay on success', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      cardEditorStore.updateCard(updatedCard);
      await vi.advanceTimersByTimeAsync(1000);
      expect(get(cardEditorStore).status).toBe('saved');
    });
  });

  describe('deleteCard and restoreCard', () => {
    it('should optimistically remove the card from local state', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      await cardEditorStore.deleteCard(MOCK_CARD_ID);

      expect(get(cardEditorStore).cards).toHaveLength(MOCK_CARDS.length - 1);
      expect(cardService.deleteCard).toHaveBeenCalledWith(MOCK_CARD_ID);
    });

    it('should restore a card via restoreCard', async () => {
      await cardEditorStore.open(MOCK_NODE_ID);
      const cardToRestore = MOCK_CARDS[0];

      await cardEditorStore.deleteCard(cardToRestore.id);
      expect(get(cardEditorStore).cards.map((c) => c.id)).not.toContain(
        cardToRestore.id
      );

      await cardEditorStore.restoreCard(cardToRestore);

      expect(get(cardEditorStore).cards.map((c) => c.id)).toContain(
        cardToRestore.id
      );
      expect(cardService.updateCard).toHaveBeenCalledWith(cardToRestore);
    });
  });
});
