import { addCollection } from '@iconify/svelte';
import * as lucide from '@iconify-json/lucide/icons.json';

/**
 * Initializes the icon registry with the bundled Lucide icons.
 * This ensures icons are available offline without fetching from the CDN.
 */
export function initializeIcons() {
  try {
    // The import * as lucide brings in the module which contains the JSON content
    // We need to cast or access the default export if it exists, or use the object itself.
    // With resolveJsonModule, 'lucide' should be the JSON object.
    // However, sometimes it's 'lucide.default'.
    // Let's handle both just in case, or inspect it.
    // Standard JSON import usually gives the object.
    
    const iconData = (lucide as any).default || lucide;
    
    addCollection(iconData);
    console.log('[IconService] Lucide icons bundled and registered for offline use.');
  } catch (error) {
    console.error('[IconService] Failed to register icons:', error);
  }
}
