/**
 * @file A simple, reactive internationalization (i18n) solution for Svelte.
 * @module i18n
 */

import { derived, writable, get } from 'svelte/store';
import en from '$lib/locales/en.json';
import es from '$lib/locales/es.json';
import el from '$lib/locales/el.json';

/**
 * The translations object holds the translations for each language.
 * The keys are the language codes (e.g., 'en', 'es'), and the values
 * are the imported JSON files containing the translations.
 */
export const translations: Record<string, any> = {
  en,
  es,
  el,
};

/**
 * The list of supported locales.
 */
export const locales = Object.keys(translations);

/**
 * The default locale, used as a fallback.
 */
export const defaultLocale = 'en';

/**
 * A writable Svelte store that holds the current locale.
 * It is initialized with the default locale.
 */
export const locale = writable<string>(defaultLocale);

/**
 * A helper function to look up a translation key in a specific message object.
 * @internal
 * @param messages The translation object for a single locale.
 * @param key The dot-separated key to look up (e.g., 'welcome.tagline').
 * @returns The translation string or undefined if not found.
 */
function lookup(
  messages: Record<string, any>,
  key: string
): string | undefined {
  const path = key.split('.');
  let current: any = messages;
  for (const part of path) {
    if (
      current === undefined ||
      typeof current !== 'object' ||
      current === null
    ) {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * A helper function to translate a key into a given locale, with fallback logic
 * and support for interpolation and pluralization.
 *
 * @internal
 * @param locale The locale to translate into.
 * @param key The key to translate.
 * @param vars An object of variables to interpolate into the translation.
 * @returns The translated and processed string.
 */
function translate(
  locale: string,
  key: string,
  vars: Record<string, string | number>
): string {
  if (!key) throw new Error('no key provided to get(t)()');

  // 1. Attempt to find the translation string in the current locale.
  let text = lookup(translations[locale], key);

  // 2. If not found, fall back to the default locale.
  if (text === undefined) {
    text = lookup(translations[defaultLocale], key);
  }

  // 3. If still not found, return the key itself as the final fallback.
  if (text === undefined) {
    return key;
  }

  // 4. If a string was found, process it for pluralization (ICU Message Format).
  // Use a GREEDY match for the rules part to handle the nested braces.
  const pluralRegex = /\{(\w+),\s*plural,\s*(.+)\}/g; // <-- THE FIX IS HERE (changed .+? to .+)
  text = text.replace(pluralRegex, (match, varName, rules) => {
    const value = vars[varName];
    if (typeof value !== 'number') return match; // Cannot pluralize without a number

    const ruleMap = new Map<string, string>();
    // This inner regex can remain non-greedy as it parses one rule at a time.
    const ruleRegex = /(=\d+|zero|one|two|few|many|other)\s*\{(.*?)\}/g;
    let ruleMatch;
    while ((ruleMatch = ruleRegex.exec(rules)) !== null) {
      ruleMap.set(ruleMatch[1], ruleMatch[2]);
    }

    let replaceText = '';
    // Check for exact match first (e.g., =0, =1)
    if (ruleMap.has(`=${value}`)) {
      replaceText = ruleMap.get(`=${value}`)!;
    } else {
      // Use Intl.PluralRules for language-specific categories (one, other, etc.)
      const pluralRules = new Intl.PluralRules(locale);
      const category = pluralRules.select(value);
      if (ruleMap.has(category)) {
        replaceText = ruleMap.get(category)!;
      } else if (ruleMap.has('other')) {
        // 'other' is the mandatory fallback category
        replaceText = ruleMap.get('other')!;
      } else {
        return match; // No suitable rule found
      }
    }
    // Replace the '#' placeholder with the actual value
    return replaceText.replace(/#/g, String(value));
  });

  // 5. Process simple variable interpolation (e.g., {name}).
  Object.entries(vars).forEach(([varName, value]) => {
    const regex = new RegExp(`\\{${varName}\\}`, 'g');
    text = (text as string).replace(regex, String(value));
  });

  return text;
}

/**
 * A derived Svelte store that returns a translation function `t`
 * that is reactive to the current locale.
 */
export const t = derived(
  locale,
  ($locale) =>
    (key: string, vars: Record<string, string | number> = {}) =>
      translate($locale, key, vars)
);

/**
 * A helper function to get the `t` function outside of a Svelte component.
 */
export const gett = () => get(t);
