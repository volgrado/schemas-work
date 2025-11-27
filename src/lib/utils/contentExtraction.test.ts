import { describe, it, expect } from 'vitest';
import { extractContentWithPositions } from './contentExtraction';

describe('extractContentWithPositions', () => {
  it('should be a function', () => {
    expect(typeof extractContentWithPositions).toBe('function');
  });
});
