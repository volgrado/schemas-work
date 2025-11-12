/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

// A unique name for your cache
const CACHE_NAME = `schemas-work-cache-${version}`;

// All the files SvelteKit generated for your app
const ASSETS_TO_CACHE: string[] = [...build, ...files];

self.addEventListener('install', (event) => {
  // @ts-expect-error - event.waitUntil is valid
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // @ts-expect-error - event.waitUntil is valid
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete old caches
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // @ts-expect-error - event.request is valid
  const request = event.request;

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // @ts-expect-error - event.respondWith is valid
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached file if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network.
      // This is a "cache-first" strategy.
      return fetch(request);
    })
  );
});
