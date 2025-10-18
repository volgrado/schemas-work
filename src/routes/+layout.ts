// src/routes/+layout.ts

import type { LayoutLoad } from './$types';

// The logic that was here is no longer needed, as redirects are handled by the new root page.
export const load: LayoutLoad = ({ url }) => {
  return {};
};
