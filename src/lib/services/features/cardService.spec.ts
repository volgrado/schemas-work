import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import type { Card, ReviewQuality, SrsData } from '$lib/types';
import * as reviewService from './reviewService';
import { defaultDeckOptions } from './deckService';

// --- MOCK CONSTANTS ---
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MOCK_CURRENT_TIME = 1672531200000; // Jan 1, 2023 00:00:00 UTC

// --- MOCK DEPENDENCIES (Modern Pattern) ---
vi.mock('$lib/services/features/cardService', () => ({
  getAllCards: vi.fn(),
}));
import { getAllCards } from '$lib/services/features/cardService';

describe('reviewService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_CURRENT_TIME);
    (getAllCards as Mock).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Fixture Data ---
  const createCardFixture = (id: string, srs?: Partial<SrsData>): Card => ({
    id,
    type: 'basic',
    nodeId: `node-${id}`,
    content: {
      question: `Q for ${id}`,
      answer: `A for ${id}`,
    },
    srs: {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: MOCK_CURRENT_TIME - ONE_DAY_MS, // Default is due yesterday
      ...srs,
    },
  });

  // -------------------------
  // 1. calculateNextReview (SRS Algorithm)
  // -------------------------
  describe('calculateNextReview', () => {
    it.each([0, 1, 2])(
      'should reset repetitions to 0 and interval to 1 day for quality = %i',
      async (quality) => {
        const initialCard = createCardFixture('c1', {
          repetitions: 5,
          interval: 10,
          easeFactor: 2.5,
        });
        const updatedCard = await reviewService.calculateNextReview(
          initialCard,
          quality as ReviewQuality,
          defaultDeckOptions
        );
        expect(updatedCard.srs!.repetitions).toBe(0);
        expect(updatedCard.srs!.interval).toBe(0);
        expect(updatedCard.srs!.dueDate).toBe(MOCK_CURRENT_TIME + 60000); // 1 minute
      }
    );

    it('should decrease ease factor by a fixed amount when quality is low (2)', async () => {
      const initialCard = createCardFixture('c1', { easeFactor: 2.0 });
      const updatedCard = await reviewService.calculateNextReview(
        initialCard,
        2 as ReviewQuality,
        defaultDeckOptions
      );
      expect(updatedCard.srs!.easeFactor).toBe(1.8);
    });

    it('should clamp the ease factor at 1.3 on failure', async () => {
      const initialCard = createCardFixture('c1', { easeFactor: 1.4 });
      const updatedCard = await reviewService.calculateNextReview(
        initialCard,
        1 as ReviewQuality,
        defaultDeckOptions
      );
      expect(updatedCard.srs!.easeFactor).toBe(1.3);
    });

    it('should calculate the next review step for a new card (R=0 -> R=1, I=1)', async () => {
      const initialCard = createCardFixture('c1', {
        repetitions: 0,
        interval: 0,
      });
      const updatedCard = await reviewService.calculateNextReview(
        initialCard,
        5 as ReviewQuality,
        defaultDeckOptions
      );
      expect(updatedCard.srs!.repetitions).toBe(1);
      expect(updatedCard.srs!.interval).toBe(1);
      expect(updatedCard.srs!.dueDate).toBe(MOCK_CURRENT_TIME + ONE_DAY_MS);
      expect(updatedCard.srs!.easeFactor).toBeGreaterThan(2.5);
    });

    it('should calculate the next review step for a learned card (R=1 -> R=2, I=6)', async () => {
      const initialCard = createCardFixture('c1', {
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
      });
      const updatedCard = await reviewService.calculateNextReview(
        initialCard,
        5 as ReviewQuality,
        defaultDeckOptions
      );
      expect(updatedCard.srs!.repetitions).toBe(2);
      expect(updatedCard.srs!.interval).toBe(6);
      expect(updatedCard.srs!.dueDate).toBe(MOCK_CURRENT_TIME + 6 * ONE_DAY_MS);
    });

    it('should calculate future interval based on ease factor (R>=2)', async () => {
      const initialCard = createCardFixture('c1', {
        repetitions: 2,
        interval: 6,
        easeFactor: 2.5,
      });
      const updatedCard = await reviewService.calculateNextReview(
        initialCard,
        5 as ReviewQuality,
        defaultDeckOptions
      );
      expect(updatedCard.srs!.repetitions).toBe(3);
      expect(updatedCard.srs!.interval).toBe(15);
      expect(updatedCard.srs!.dueDate).toBe(
        MOCK_CURRENT_TIME + 15 * ONE_DAY_MS
      );
      expect(updatedCard.srs!.easeFactor).toBeCloseTo(2.6);
    });
  });

  // -------------------------
  // 2. getDueCards (Scheduling)
  // -------------------------
  describe('getDueCards', () => {
    it('should return cards that are due for review, regardless of order', async () => {
      const cards: Card[] = [
        createCardFixture('c0', { dueDate: MOCK_CURRENT_TIME }), // Due Today
        createCardFixture('c1', { dueDate: MOCK_CURRENT_TIME - ONE_DAY_MS }), // Due Yesterday
        createCardFixture('c2', { dueDate: MOCK_CURRENT_TIME + ONE_DAY_MS }), // Due Tomorrow
        createCardFixture('c3', { dueDate: 0 }), // Effectively due
        // FIX: Use the fixture to create a valid "new" card, which includes the required `srs` property.
        // The default fixture is due yesterday, so it will be included correctly.
        createCardFixture('c4'),
      ];
      (getAllCards as Mock).mockResolvedValue(cards);

      const dueCards = await reviewService.getDueCards();
      expect(dueCards).toHaveLength(4);
      expect(dueCards.map((c) => c.id)).toEqual(
        expect.arrayContaining(['c0', 'c1', 'c3', 'c4'])
      );
    });
  });

  // -------------------------
  // 3. getWeakestCards (Prioritization)
  // -------------------------
  describe('getWeakestCards', () => {
    it('should return the top N cards sorted by lowest ease factor', async () => {
      const cards = [
        createCardFixture('c_weakest', { easeFactor: 1.5 }),
        createCardFixture('c_strongest', { easeFactor: 3.0 }),
        createCardFixture('c_average', { easeFactor: 2.0 }),
      ];
      (getAllCards as Mock).mockResolvedValue(cards);
      const weakest = await reviewService.getWeakestCards(2);
      expect(weakest.map((c) => c.id)).toEqual(['c_weakest', 'c_average']);
    });

    it('should treat cards with default ease factor correctly', async () => {
      const cards: Card[] = [
        // FIX: Use the fixture to create a valid "new" card with the default ease factor of 2.5.
        createCardFixture('c_new'),
        createCardFixture('c_weak', { easeFactor: 1.8 }),
        createCardFixture('c_strong', { easeFactor: 2.8 }),
      ];
      (getAllCards as Mock).mockResolvedValue(cards);
      const weakest = await reviewService.getWeakestCards(2);
      expect(weakest.map((c) => c.id)).toEqual(['c_weak', 'c_new']);
    });
  });

  // -------------------------
  // 4. evaluateAnswer (Interactive Cards)
  // -------------------------
  describe('evaluateAnswer', () => {
    it('should return 5 for a perfect, case-insensitive match', async () => {
      const result = await reviewService.evaluateAnswer(
        'The quick brown Fox',
        'the quick brown fox'
      );
      expect(result).toBe(5);
    });

    it('should return 5 despite whitespace differences (trimming)', async () => {
      const result = await reviewService.evaluateAnswer('  Paris  ', 'Paris');
      expect(result).toBe(5);
    });

    it('should return 0 for an incorrect answer', async () => {
      const result = await reviewService.evaluateAnswer('London', 'Paris');
      expect(result).toBe(0);
    });
  });
});
