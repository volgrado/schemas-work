// src/params/lang.ts
/**
 * @file This file defines a SvelteKit parameter matcher for the `lang` parameter.
 *
 * The matcher ensures that the `lang` parameter in the URL is a valid locale
 * supported by the application. This is a crucial part of the internationalization
 * (i18n) setup, as it prevents invalid language codes from being used in routes.
 */
import { locales } from '$lib/utils/i18n';
import type { ParamMatcher } from '@sveltejs/kit';

/**
 * A SvelteKit parameter matcher that validates the `lang` parameter.
 *
 * This function is automatically called by SvelteKit when a route contains
 * the `[lang]` parameter. It checks if the provided parameter is included

 * in the list of supported `locales`.
 *
 * @param {string} param - The value of the `lang` parameter from the URL.
 * @returns {boolean} `true` if the parameter is a valid locale, otherwise `false`.
 */
export const match: ParamMatcher = (param) => {
  return locales.includes(param);
};
