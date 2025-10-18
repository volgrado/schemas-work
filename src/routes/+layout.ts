// src/routes/+layout.ts (This will now be valid)

import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
  if (url.pathname === '/') {
    throw redirect(307, '/en');
  }

  // With the global requirement for `lang` removed,
  // returning an empty object is now perfectly valid.
  return {};
};
