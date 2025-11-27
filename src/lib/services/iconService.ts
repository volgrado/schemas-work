/**
 * @file iconService.ts
 * @service
 * @description
 * This service handles the initialization and registration of the application's icon set.
 * It bundles Lucide icons (via `@iconify-json/lucide`) to ensure they are available offline,
 * removing the dependency on external CDNs for icon rendering.
 */

import { addCollection } from '@iconify/svelte';
import * as lucide from '@iconify-json/lucide/icons.json';
import * as errorService from '$lib/core/services/errorService';

/**
 * Initializes the icon registry with the bundled Lucide icons.
 *
 * This function attempts to load the Lucide icon set from the imported JSON
 * and registers it with the Iconify runtime using `addCollection`.
 * It includes robust error handling to report any issues during the initialization process.
 *
 * @returns {void}
 */
export function initializeIcons(): void {
  try {
    // The import * as lucide brings in the module which contains the JSON content
    // We need to cast or access the default export if it exists, or use the object itself.
    // With resolveJsonModule, 'lucide' should be the JSON object.
    // However, sometimes it's 'lucide.default'.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iconData = (lucide as any).default || lucide;
    
    addCollection(iconData);
    console.log('[IconService] Lucide icons bundled and registered for offline use.');
  } catch (error) {
    errorService.reportError(error as Error, {
      context: 'IconService',
      action: 'initializeIcons',
    });
  }
}
