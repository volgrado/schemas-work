/**
 * @file A simple, reactive internationalization (i18n) solution for Svelte.
 * @module i18n
 */

import en from '$lib/locales/en.json';
import es from '$lib/locales/es.json';
import el from '$lib/locales/el.json';

/**
 * The translations object holds the translations for each language.
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

// --- Runes Implementation ---

class I18nState {
  locale = $state<string>(defaultLocale);

  constructor() {
    this.setLocale(defaultLocale);
  }

  setLocale(newLocale: string) {
    if (locales.includes(newLocale)) {
      this.locale = newLocale;
    } else {
      console.warn(
        `[i18n] Locale '${newLocale}' not supported. Falling back to '${defaultLocale}'.`
      );
      this.locale = defaultLocale;
    }
  }

  /**
   * Translates a key into the current locale.
   * This is a getter so it's reactive when used in $effect or derived runes.
   */
  get t() {
    return (key: string, vars: Record<string, string | number> = {}) => {
      return translate(this.locale, key, vars);
    };
  }
}

export const i18n = new I18nState();

/**
 * A helper function to look up a translation key in a specific message object.
 * @internal
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
 * A helper function to translate a key into a given locale.
 * @internal
 */
function translate(
  locale: string,
  key: string,
  vars: Record<string, string | number>
): string {
  if (!key) {
    // Return empty string or warning if no key, consistent with previous behavior or safety
    return '';
  }

  // 1. Attempt to find the translation string in the current locale.
  let text = lookup(translations[locale], key);

  // 2. If not found, fall back to the default locale.
  if (text === undefined) {
    text = lookup(translations[defaultLocale], key);
  }

  // 3. If still not found, check for a fallback in the variables.
  if (text === undefined && vars && typeof vars.fallback === 'string') {
    return vars.fallback as string;
  }

  // 4. If still not found, return the key itself as the final fallback.
  if (text === undefined) {
    return key;
  }

  // 4. If a string was found, process it for pluralization (ICU Message Format).
  const pluralRegex = /\{(\w+),\s*plural,\s*(.+)\}/g;
  text = text.replace(pluralRegex, (match, varName, rules) => {
    const value = vars[varName];
    if (typeof value !== 'number') return match;

    const ruleMap = new Map<string, string>();
    const ruleRegex = /(=\d+|zero|one|two|few|many|other)\s*\{(.*?)\}/g;
    let ruleMatch;
    while ((ruleMatch = ruleRegex.exec(rules)) !== null) {
      ruleMap.set(ruleMatch[1], ruleMatch[2]);
    }

    let replaceText = '';
    if (ruleMap.has(`=${value}`)) {
      replaceText = ruleMap.get(`=${value}`)!;
    } else {
      const pluralRules = new Intl.PluralRules(locale);
      const category = pluralRules.select(value);
      if (ruleMap.has(category)) {
        replaceText = ruleMap.get(category)!;
      } else if (ruleMap.has('other')) {
        replaceText = ruleMap.get('other')!;
      } else {
        return match;
      }
    }
    return replaceText.replace(/#/g, String(value));
  });

  // 5. Process simple variable interpolation (e.g., {name}).
  Object.entries(vars).forEach(([varName, value]) => {
    const regex = new RegExp(`\\{${varName}\\}`, 'g');
    text = (text as string).replace(regex, String(value));
  });

  return text;
}
