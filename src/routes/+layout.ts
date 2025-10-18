// src/routes/+layout.ts (This will now be valid)

import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
  if (url.pathname === '/') {
    // This redirect will now be handled by the server hook, not the static build.
    // The static adapter will be able to successfully generate the fallback page.
  }

  // With the global requirement for `lang` removed,
  // returning an empty object is now perfectly valid.
  return {};
};
