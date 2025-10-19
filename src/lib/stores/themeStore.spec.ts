/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest'; // <-- Import the Mock type here
import { get } from 'svelte/store';
import { THEME_STORAGE_KEY } from '$lib/constants';
import type { Theme } from './themeStore';

// Mock SvelteKit's environment module to simulate a browser environment
vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
}));

// Mocks
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => (store = {})),
  };
};

const createMatchMediaMock = (matches: boolean) => {
  const mediaQueryList = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  return vi.fn().mockImplementation(() => mediaQueryList);
};

describe('themeStore', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('matchMedia', createMatchMediaMock(false));
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe('Initialization', () => {
    it('initializes with "dark" theme from localStorage', async () => {
      localStorageMock.setItem(THEME_STORAGE_KEY, 'dark');
      vi.resetModules();
      const themeStoreModule = await import('./themeStore');
      expect(get(themeStoreModule.theme)).toBe('dark');
    });

    it('initializes with "system" theme from localStorage', async () => {
      localStorageMock.setItem(THEME_STORAGE_KEY, 'system');
      vi.resetModules();
      const themeStoreModule = await import('./themeStore');
      expect(get(themeStoreModule.theme)).toBe('system');
    });

    it('defaults to "system" theme if localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      vi.resetModules();
      const themeStoreModule = await import('./themeStore');
      expect(get(themeStoreModule.theme)).toBe('system');
    });

    it('defaults to "system" theme if localStorage value is invalid', async () => {
      localStorageMock.setItem(THEME_STORAGE_KEY, 'invalid');
      vi.resetModules();
      const themeStoreModule = await import('./themeStore');
      expect(get(themeStoreModule.theme)).toBe('system');
    });
  });

  describe('Functionality', () => {
    let themeStoreModule: typeof import('./themeStore');

    beforeEach(async () => {
      vi.resetModules();
      themeStoreModule = await import('./themeStore');
    });

    describe('applyTheme', () => {
      it('adds "dark-theme" class when theme is "dark"', () => {
        themeStoreModule.applyTheme('dark');
        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          true
        );
      });

      it('removes "dark-theme" class when theme is "light"', () => {
        document.documentElement.classList.add('dark-theme');
        themeStoreModule.applyTheme('light');
        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          false
        );
      });

      it('adds "dark-theme" class for "system" theme when OS prefers dark', () => {
        vi.stubGlobal('matchMedia', createMatchMediaMock(true));
        themeStoreModule.applyTheme('system');
        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          true
        );
      });

      it('does not add "dark-theme" for "system" theme when OS prefers light', () => {
        themeStoreModule.applyTheme('system');
        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          false
        );
      });
    });

    describe('cycleTheme', () => {
      it('cycles from light -> dark and updates localStorage', () => {
        themeStoreModule.theme.set('light');
        themeStoreModule.cycleTheme();
        expect(get(themeStoreModule.theme)).toBe('dark');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          THEME_STORAGE_KEY,
          'dark'
        );
      });

      it('cycles from dark -> system and updates localStorage', () => {
        themeStoreModule.theme.set('dark');
        themeStoreModule.cycleTheme();
        expect(get(themeStoreModule.theme)).toBe('system');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          THEME_STORAGE_KEY,
          'system'
        );
      });

      it('cycles from system -> light and updates localStorage', () => {
        themeStoreModule.theme.set('system');
        themeStoreModule.cycleTheme();
        expect(get(themeStoreModule.theme)).toBe('light');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          THEME_STORAGE_KEY,
          'light'
        );
      });
    });

    describe('System Preference Change', () => {
      it('re-applies theme when system preference changes and current theme is "system"', async () => {
        const matchMediaMock = createMatchMediaMock(false);
        vi.stubGlobal('matchMedia', matchMediaMock);

        vi.resetModules();
        const module = await import('./themeStore');
        module.theme.set('system');
        module.applyTheme('system');

        const addListenerCalls = (matchMediaMock().addEventListener as Mock)
          .mock.calls; // <-- Use Mock here
        expect(addListenerCalls.length).toBeGreaterThan(0);
        const listener = addListenerCalls[0][1];

        (matchMediaMock().matches as boolean) = true;
        listener({ matches: true });

        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          true
        );
      });

      it('does NOT re-apply theme if system preference changes but current theme is "dark"', async () => {
        const matchMediaMock = createMatchMediaMock(false);
        vi.stubGlobal('matchMedia', matchMediaMock);

        vi.resetModules();
        const module = await import('./themeStore');
        module.theme.set('dark');
        module.applyTheme('dark');

        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          true
        );

        const addListenerCalls = (matchMediaMock().addEventListener as Mock)
          .mock.calls; // <-- Use Mock here
        expect(addListenerCalls.length).toBeGreaterThan(0);
        const listener = addListenerCalls[0][1];

        (matchMediaMock().matches as boolean) = true;
        listener({ matches: true });

        expect(document.documentElement.classList.contains('dark-theme')).toBe(
          true
        );
      });
    });
  });
});
