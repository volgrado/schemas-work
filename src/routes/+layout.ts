// src/routes/+layout.ts

import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
  if (url.pathname === '/') {
    // This redirect is now correctly handled by `hooks.server.ts` for live traffic,
    // not during the static build. This allows the adapter to generate the necessary
    // fallback page at the root.
  }

  // Returning an empty object is now valid and expected.
  return {};
};
