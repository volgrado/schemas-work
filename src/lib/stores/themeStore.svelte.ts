/**
 * @file src/lib/stores/themestore.svelte.ts
 * @description Manages the application's theme using Svelte 5 Runes.
 */

import { browser } from '$app/environment';
import { THEME_STORAGE_KEY } from '$lib/constants';

export type Theme = 'light' | 'dark' | 'system';

function getInitialState(): Theme {
  if (!browser) return 'system';
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
    return storedTheme;
  }
  return 'system';
}

// Helper function remains the same
function _applyThemeToDOM(selectedTheme: Theme) {
  if (!browser) return;
  const root = document.documentElement;
  root.classList.remove('light-theme', 'dark-theme');
  let isDark =
    selectedTheme === 'dark' ||
    (selectedTheme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.add(isDark ? 'dark-theme' : 'light-theme');
}

class ThemeStore {
  // FIX: The $state rune is now a public property of the class.
  theme = $state<Theme>(getInitialState());



  cycle() {
    // FIX: Mutate the class property directly.
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.theme = themes[nextIndex];
  }

  set(newTheme: Theme) {
    this.theme = newTheme;
  }
}

export const themeStore = new ThemeStore();
export { _applyThemeToDOM };
