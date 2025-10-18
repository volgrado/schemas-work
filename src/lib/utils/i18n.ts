import { derived, writable } from 'svelte/store';
import { get } from 'svelte/store';
import en from '$lib/locales/en.json';
import es from '$lib/locales/es.json';

export const translations = {
  en,
  es,
};

export const locale = writable('en');

function translate(locale, key, vars) {
  if (!key) throw new Error('no key provided to $t()');

  let text = translations[locale];
  key.split('.').forEach((k) => (text = text ? text[k] : undefined));

  if (!text) return key;

  Object.keys(vars).map((k) => {
    const regex = new RegExp(`{{${k}}}`, 'g');
    text = text.replace(regex, vars[k]);
  });

  return text;
}

export const t = derived(
  locale,
  ($locale) =>
    (key, vars = {}) =>
      translate($locale, key, vars)
);

export const gett = () => get(t);
