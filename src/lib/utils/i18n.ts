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
 * The default locale.
 */
export const defaultLocale = 'en';

/**
 * A writable Svelte store that holds the current locale.
 * It is initialized with the default locale.
 */
export const locale = writable<string>(defaultLocale);

/**
 * A helper function to translate a key into a given locale.
 *
 * @param locale The locale to translate into.
 * @param key The key to translate.
 * @param vars An object of variables to interpolate into the translation.
 * @returns The translated string.
 */
function translate(
  locale: string,
  key: string,
  vars: Record<string, string | number>
): string {
  if (!key) throw new Error('no key provided to get(t)()');

  let text = translations[locale];
  if (!text) {
    text = translations[defaultLocale];
  }

  key.split('.').forEach((k) => (text = text ? text[k] : undefined));

  if (typeof text !== 'string') return key;

  // Handle pluralization (ICU Message Format)
  const pluralRegex = /\{(\w+),\s*plural,\s*(.+?)\}/g;
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
        return match; // No suitable rule found
      }
    }
    return replaceText.replace(/#/g, String(value));
  });

  // Handle simple variable interpolation
  Object.entries(vars).forEach(([varName, value]) => {
    const regex = new RegExp(`\\{${varName}\\}`, 'g');
    text = text.replace(regex, String(value));
  });

  return text;
}

/**
 * A derived Svelte store that returns a translation function `t`
 * that is reactive to the current locale.
 *
 * The `t` function takes a key and an optional object of variables.
 *
 * Example:
 * ```svelte
 * <script>
 * import { t } from '$lib/utils/i18n';
 * </script>
 *
 * <h1>{get(t)('welcome.title', { name: 'World' })}</h1>
 * ```
 */
export const t = derived(
  locale,
  ($locale) =>
    (key: string, vars: Record<string, string | number> = {}) =>
      translate($locale, key, vars)
);

/**
 * A helper function to get the `t` function outside of a Svelte component.
 * This is useful for using translations in regular TypeScript/JavaScript files.
 *
 * Example:
 * ```typescript
 * import { gett } from '$lib/utils/i18n';
 *
 * const t = gett();
 * const title = get(t)('welcome.title');
 * ```
 */
export const gett = () => get(t);
