import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { THEME_STORAGE_KEY } from '$lib/constants';

export type Theme = 'light' | 'dark' | 'system';

// Function to get the initial theme from localStorage or default to 'system'
function getInitialTheme(): Theme {
  if (!browser) return 'system'; // Default to system on the server

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
    return storedTheme;
  }
  return 'system'; // Default if nothing is stored or the value is invalid
}

const initialTheme = getInitialTheme();
export const theme = writable<Theme>(initialTheme);

// Update localStorage whenever the theme store changes
theme.subscribe((value) => {
  if (browser) {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  }
});

/**
 * Applies the appropriate CSS class to the root <html> element based on the selected theme.
 * For 'system' theme, it checks the user's OS preference.
 * @param selectedTheme The theme to apply: 'light', 'dark', or 'system'.
 */
export function applyTheme(selectedTheme: Theme) {
  if (!browser) return;

  const root = document.documentElement;
  root.classList.remove('light-theme', 'dark-theme');

  if (selectedTheme === 'light') {
    // You can add 'light-theme' if you have specific light-only styles,
    // but it's often not needed if light is the default.
  } else if (selectedTheme === 'dark') {
    root.classList.add('dark-theme');
  } else {
    // 'system' theme: check the OS preference
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    if (prefersDark) {
      root.classList.add('dark-theme');
    }
  }
}

// Apply the initial theme when the app loads and listen for system changes.
if (browser) {
  applyTheme(initialTheme);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (get(theme) === 'system') {
      applyTheme('system'); // Re-apply to reflect OS change
    }
  };
  mediaQuery.addEventListener('change', handleSystemChange);
}

/**
 * Cycles through the available themes ('light' -> 'dark' -> 'system' -> 'light').
 */
export function cycleTheme() {
  theme.update((currentTheme) => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    applyTheme(nextTheme); // Apply theme class immediately on cycle
    return nextTheme;
  });
}
