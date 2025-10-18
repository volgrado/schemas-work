import { locales } from '$lib/utils/i18n';
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
  return locales.includes(param);
};
