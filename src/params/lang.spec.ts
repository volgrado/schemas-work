/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { match } from './lang';

describe('lang param matcher', () => {
  it('returns true for supported languages', () => {
    expect(match('en')).toBe(true);
    expect(match('es')).toBe(true);
  });

  it('returns false for unsupported languages', () => {
    expect(match('fr')).toBe(false);
    expect(match('de')).toBe(false);
  });
});
