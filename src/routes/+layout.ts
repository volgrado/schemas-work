// src/routes/+layout.ts

import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
  // The redirect is now handled on the client-side in +layout.svelte
  // This function can be simplified or used for other purposes if needed.
  return {};
};
