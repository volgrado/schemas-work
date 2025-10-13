import { describe, it, expect } from 'vitest';
import { calculateNextReview } from './reviewService';
import type { DomainCard } from '$lib/types';

describe('reviewService', () => {
  it('should handle a correct response for a new card', () => {
    const card: DomainCard = { q: 'question', a: 'answer' };
    const updatedCard = calculateNextReview(card, 5);
    expect(updatedCard.repetitions).toBe(1);
    expect(updatedCard.interval).toBe(1);
    expect(updatedCard.easeFactor).toBeCloseTo(2.6);
    expect(updatedCard.dueDate).toBeGreaterThan(Date.now());
  });

  it('should handle a correct response for a card that has been reviewed once', () => {
    const card: DomainCard = {
      q: 'question',
      a: 'answer',
      repetitions: 1,
      interval: 1,
      easeFactor: 2.6,
    };
    const updatedCard = calculateNextReview(card, 5);
    expect(updatedCard.repetitions).toBe(2);
    expect(updatedCard.interval).toBe(6);
    expect(updatedCard.easeFactor).toBeCloseTo(2.7);
    expect(updatedCard.dueDate).toBeGreaterThan(Date.now());
  });

  it('should handle a correct response for a card that has been reviewed multiple times', () => {
    const card: DomainCard = {
      q: 'question',
      a: 'answer',
      repetitions: 2,
      interval: 6,
      easeFactor: 2.7,
    };
    const updatedCard = calculateNextReview(card, 5);
    expect(updatedCard.repetitions).toBe(3);
    expect(updatedCard.interval).toBe(16); // 6 * 2.7 = 16.2 -> 16
    expect(updatedCard.easeFactor).toBeCloseTo(2.8);
    expect(updatedCard.dueDate).toBeGreaterThan(Date.now());
  });

  it('should handle an incorrect response', () => {
    const card: DomainCard = {
      q: 'question',
      a: 'answer',
      repetitions: 2,
      interval: 6,
      easeFactor: 2.7,
    };
    const updatedCard = calculateNextReview(card, 0);
    expect(updatedCard.repetitions).toBe(0);
    expect(updatedCard.interval).toBe(1);
    expect(updatedCard.easeFactor).toBe(2.5);
    expect(updatedCard.dueDate).toBeGreaterThan(Date.now());
  });
});