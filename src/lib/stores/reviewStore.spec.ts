// src/lib/stores/reviewStore.spec.ts
/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'; // Import Mock as an alternative if tsconfig fails
import { writable, get } from 'svelte/store';
import type { Card, SrsData } from '$lib/types';

// --- MOCK DEPENDENCIES ---

vi.mock('$lib/services/features/reviewService', () => ({
  calculateNextReview: vi.fn(),
  getDueCards: vi.fn(),
  getWeakestCards: vi.fn(),
}));

vi.mock('$lib/services/features/cardService', () => ({
  updateCard: vi.fn(),
}));

vi.mock('$lib/stores/ttsStore', () => ({
  ttsStore: { subscribe: vi.fn(() => () => {}) },
}));

vi.mock('$lib/stores/editorStore', () => {
  const mockChainApi = {
    focus: vi.fn().mockReturnThis(),
    setNodeSelection: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  };

  const mockEditorInstance = {
    on: vi.fn(),
    off: vi.fn(),
    chain: vi.fn(() => mockChainApi),
    state: { doc: { descendants: vi.fn(), nodeAt: vi.fn(), eq: vi.fn() } },
  };

  const mockStore = writable({
    instance: mockEditorInstance as any,
    selectedNodePos: 5,
  });

  return {
    editorStore: mockStore,
    __mockEditorStore: mockStore,
    __mockEditorInstance: mockEditorInstance,
  };
});

vi.mock('$lib/utils/i18n', () => ({
  t: {
    subscribe: (run: any) => {
      run((key: string) => key);
      return () => {};
    },
    get: () => (key: string) => key,
  },
}));

vi.mock('svelte-sonner', () => {
  const mockToastSuccess = vi.fn();
  const mockToastInfo = vi.fn();
  return {
    toast: { success: mockToastSuccess, info: mockToastInfo },
    __mockToastSuccess: mockToastSuccess,
    __mockToastInfo: mockToastInfo,
  };
});

// --- IMPORTS AFTER MOCKS ---
import { reviewStore } from './reviewStore';
import * as reviewService from '$lib/services/features/reviewService';
import * as cardService from '$lib/services/features/cardService';
// @ts-expect-error
import { __mockEditorStore, __mockEditorInstance } from './editorStore';
// @ts-expect-error
import { __mockToastSuccess, __mockToastInfo } from 'svelte-sonner';

const getState = () => get(reviewStore);

describe('reviewStore', () => {
  let mockEditorStoreUpdate: ReturnType<typeof vi.spyOn>;
  const MOCK_SRS_DATA: SrsData = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: 0,
  };
  const MOCK_CARD_1: Card = {
    id: 'c1',
    nodeId: 'n1',
    type: 'basic',
    content: { question: 'Q1', answer: 'A1' },
    srs: MOCK_SRS_DATA,
  };
  const MOCK_CARD_2: Card = {
    id: 'c2',
    nodeId: 'n2',
    type: 'basic',
    content: { question: 'Q2', answer: 'A2' },
    srs: MOCK_SRS_DATA,
  };
  const MOCK_CARDS = [MOCK_CARD_1, MOCK_CARD_2];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockEditorStoreUpdate = vi.spyOn(__mockEditorStore, 'update');

    (reviewService.getDueCards as Mock).mockResolvedValue([...MOCK_CARDS]);
    (reviewService.getWeakestCards as Mock).mockResolvedValue([...MOCK_CARDS]);
    (reviewService.calculateNextReview as Mock).mockImplementation(
      (card: Card) => ({
        ...card,
        isUpdated: true,
      })
    );

    reviewStore.finishReview();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockEditorStoreUpdate.mockRestore();
  });

  describe('startReview', () => {
    it('fetches due cards and initializes session if cards exist', async () => {
      await reviewStore.startReview();
      expect(reviewService.getDueCards).toHaveBeenCalled();
      expect(getState().isReviewing).toBe(true);
      expect(getState().cardsToReview).toEqual(MOCK_CARDS);
      expect(__mockToastInfo).toHaveBeenCalledWith(
        'review.review_started_toast'
      );
    });

    it('shows toast with action if no cards are due', async () => {
      (reviewService.getDueCards as Mock).mockResolvedValue([]);
      await reviewStore.startReview();
      expect(getState().isReviewing).toBe(false);
      expect(__mockToastSuccess).toHaveBeenCalledWith(
        'review.all_reviewed_toast',
        expect.objectContaining({ action: expect.any(Object) })
      );
    });
  });

  describe('finishReview', () => {
    it('resets state to initial', async () => {
      await reviewStore.startReview();
      reviewStore.finishReview();
      expect(getState().isReviewing).toBe(false);
      expect(getState().cardsToReview).toEqual([]);
    });
  });

  describe('submitReview', () => {
    beforeEach(async () => {
      await reviewStore.startReview();
    });

    it('advances to next card on quality >= 3', async () => {
      await reviewStore.submitReview(5);
      expect(reviewService.calculateNextReview).toHaveBeenCalledWith(
        MOCK_CARD_1,
        5
      );
      expect(cardService.updateCard).toHaveBeenCalled();
      expect(getState().cardsToReview).toHaveLength(1);
      expect(getState().cardsToReview[0].id).toBe('c2');
    });

    it('re-queues card to end on quality < 3', async () => {
      await reviewStore.submitReview(0);
      expect(getState().cardsToReview).toHaveLength(2);
      expect(getState().cardsToReview[0].id).toBe('c2');
      expect(getState().cardsToReview[1].id).toBe('c1');
      expect(__mockToastInfo).toHaveBeenCalledWith(
        'review.card_will_reappear_toast'
      );
    });

    it('ends review when last card submitted with quality >= 3', async () => {
      (reviewService.getDueCards as Mock).mockResolvedValue([MOCK_CARD_1]);
      await reviewStore.startReview();
      await reviewStore.submitReview(5);
      expect(getState().isReviewing).toBe(false);
      expect(__mockToastSuccess).toHaveBeenCalledWith(
        'review.review_complete_toast',
        expect.any(Object)
      );
    });
  });

  describe('answer visibility', () => {
    beforeEach(async () => {
      await reviewStore.startReview();
    });

    it('showAnswer sets isAnswerShown', () => {
      reviewStore.showAnswer();
      expect(getState().isAnswerShown).toBe(true);
    });

    it('submitInteractiveAnswer sets isAnswerShown and lastAnswerCorrect', async () => {
      await reviewStore.submitInteractiveAnswer(true);
      expect(getState().isAnswerShown).toBe(true);
      expect(getState().lastAnswerCorrect).toBe(true);
    });
  });

  describe('jumpToSource', () => {
    it('closes review and updates editor selection', async () => {
      await reviewStore.startReview();

      (__mockEditorInstance.state.doc.descendants as Mock).mockImplementation(
        (cb: (node: { attrs: { nodeId: string } }, pos: number) => void) => {
          cb({ attrs: { nodeId: 'n1' } }, 100);
          return false;
        }
      );

      await reviewStore.jumpToSource();

      expect(getState().isReviewing).toBe(false);
      expect(mockEditorStoreUpdate).toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(__mockEditorInstance.chain).toHaveBeenCalled();
      expect(
        __mockEditorInstance.chain().setNodeSelection
      ).toHaveBeenCalledWith(100);
    });
  });
});
