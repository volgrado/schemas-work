// src/lib/utils/i18n.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// We must mock the file dependencies before importing the module under test
// to ensure the translations object in i18n.ts is populated correctly.

// Mock the direct file imports
vi.mock('$lib/locales/en.json', () => ({
  default: {
    app_name: 'Schemas',
    welcome: {
      tagline:
        'Structure your knowledge, visualize your ideas, and learn effectively.',
    },
    plural: {
      test: '{count, plural, =1 {1 card} other {# cards}}.',
    },
    interpolation: {
      test: 'Hello {name}, your ID is {id}.',
    },
  },
}));

vi.mock('$lib/locales/es.json', () => ({
  default: {
    app_name: 'Schemas (ES)',
    welcome: {
      tagline:
        'Estructura tu conocimiento, visualiza tus ideas y aprende eficazmente.',
    },
    plural: {
      // ICU rules for Spanish (no distinction between 0, one, two, etc., only =1 and other are typically needed)
      test: '{count, plural, =1 {1 tarjeta} other {# tarjetas}}.',
    },
    interpolation: {
      test: 'Hola {name}, tu ID es {id}.',
    },
  },
}));

vi.mock('$lib/locales/el.json', () => ({
  default: {
    // Only app_name is defined for fallback testing
    app_name: 'Σχήματα',
  },
}));

// Now import the module under test.
import { locale, t, gett, defaultLocale } from './i18n';

describe('i18n utility', () => {
  // Reset locale state before each test
  beforeEach(() => {
    locale.set(defaultLocale);
  });

  it('should return a reactive translation function via the "t" store', () => {
    const tFunc = get(t);
    expect(typeof tFunc).toBe('function');
    expect(tFunc('app_name')).toBe('Schemas');
  });

  it('should correctly retrieve the translation function outside Svelte components via "gett"', () => {
    const tFunc = gett();
    expect(typeof tFunc).toBe('function');
    expect(tFunc('app_name')).toBe('Schemas');
  });

  it('should correctly retrieve a deeply nested key from the current locale', () => {
    const tFunc = get(t);
    expect(tFunc('welcome.tagline')).toBe(
      'Structure your knowledge, visualize your ideas, and learn effectively.'
    );
  });

  it('should fall back to the key name if the key is not found', () => {
    const tFunc = get(t);
    expect(tFunc('non.existent.key')).toBe('non.existent.key');
  });

  it('should fall back to the default locale ("en") if the current locale is missing the key', () => {
    // Switch to 'el', which is mocked with only 'app_name'
    locale.set('el');
    const tFunc = get(t);

    // 'welcome.tagline' should not exist in 'el' but should fall back to 'en'
    expect(tFunc('welcome.tagline')).toBe(
      'Structure your knowledge, visualize your ideas, and learn effectively.'
    );
  });

  it('should handle simple variable interpolation correctly', () => {
    const tFunc = get(t);
    const result = tFunc('interpolation.test', { name: 'Alice', id: 42 });
    expect(result).toBe('Hello Alice, your ID is 42.');
  });

  it('should handle interpolation correctly after switching locales', () => {
    locale.set('es');
    const tFunc = get(t);
    const result = tFunc('interpolation.test', { name: 'Bob', id: 99 });
    expect(result).toBe('Hola Bob, tu ID es 99.');
  });

  describe('Pluralization (ICU Message Format)', () => {
    it('should correctly handle pluralization for count = 1 (singular)', () => {
      const tFunc = get(t);
      const result = tFunc('plural.test', { count: 1 });
      expect(result).toBe('1 card.');
    });

    it('should correctly handle pluralization for count > 1 (other)', () => {
      const tFunc = get(t);
      const result = tFunc('plural.test', { count: 5 });
      expect(result).toBe('5 cards.');
    });

    it('should correctly handle pluralization after switching locales', () => {
      // Test Spanish pluralization logic
      locale.set('es');
      const tFunc = get(t);
      expect(tFunc('plural.test', { count: 1 })).toBe('1 tarjeta.');
      expect(tFunc('plural.test', { count: 10 })).toBe('10 tarjetas.');
    });
  });
});
