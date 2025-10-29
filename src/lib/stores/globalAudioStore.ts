/**
 * @file Provides a singleton instance of the global HTMLAudioElement.
 * This store ensures that only one audio element is created throughout the
 * application's lifecycle, and that its creation is deferred until it is
 * needed on the client-side, making it safe for Server-Side Rendering (SSR).
 * @module globalAudioStore
 */

import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

// The internal store is writable, but we will only expose its `subscribe` method.
const internalStore = writable<HTMLAudioElement | null>(null);

// The singleton instance of the audio element. Kept private to this module.
let instance: HTMLAudioElement | null = null;

/**
 * Retrieves the singleton instance of the global HTMLAudioElement.
 * This function is SSR-safe. It will only create the element once,
 * on the first call within a browser environment.
 *
 * @throws {Error} If called in a non-browser environment (e.g., during SSR).
 * @returns {HTMLAudioElement} The singleton audio element.
 */
export function getGlobalAudioElement(): HTMLAudioElement {
  // If the instance already exists, return it immediately.
  if (instance) {
    return instance;
  }

  // Guard against being called on the server.
  if (!browser) {
    throw new Error(
      'getGlobalAudioElement() cannot be called on the server. Ensure it is called within onMount or after a user interaction.'
    );
  }

  // Create the instance, as we are in the browser and it doesn't exist yet.
  instance = new Audio();

  // Set the value of our internal store so reactive components can update.
  internalStore.set(instance);

  console.log('[GlobalAudioStore] Singleton HTMLAudioElement created.');

  return instance;
}

/**
 * A readable Svelte store that holds the singleton HTMLAudioElement.
 * Components can subscribe to this to reactively receive the audio element
 * once it has been created by `getGlobalAudioElement()`.
 *
 * Example: `$: ttsService = $globalAudioElementStore ? new TTSService($globalAudioElementStore) : null;`
 */
export const globalAudioElementStore: Readable<HTMLAudioElement | null> = {
  subscribe: internalStore.subscribe,
};
