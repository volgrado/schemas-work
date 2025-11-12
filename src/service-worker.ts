/// <reference lib="webworker" />
/// <reference types="vite/client" />

import { build, files, version } from '$service-worker';

// A unique name for your cache
const CACHE_NAME = `schemas-work-cache-${version}`;

// All the files SvelteKit generated for your app,
// PLUS the essential root path '/' for the main page.
const ASSETS_TO_CACHE: string[] = ['/', ...build, ...files];

// --- EVENT LISTENERS ---

// INSTALL: Pre-cache all essential assets
self.addEventListener('install', (event) => {
  const installEvent = event as ExtendableEvent;
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching all static assets.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ACTIVATE: Clean up old, unused caches
self.addEventListener('activate', (event) => {
  const activateEvent = event as ExtendableEvent;
  activateEvent.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => {
            console.log(`[ServiceWorker] Deleting old cache: ${oldKey}`);
            return caches.delete(oldKey);
          })
      )
    )
  );
});

// FETCH: Serve from cache, fall back to network, then to offline page
self.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  const request = fetchEvent.request;

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // The main fetch logic
  async function respond(): Promise<Response> {
    const cache = await caches.open(CACHE_NAME);

    // 1. Try to get the response from the cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 2. Try to get the response from the network
    try {
      const networkResponse = await fetch(request);
      // If the request is for an asset from our origin, cache it
      if (request.url.startsWith(self.location.origin)) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // 3. If the network fails (offline), provide a fallback

      // For navigation requests, serve the main index.html page
      if (request.mode === 'navigate') {
        const rootFallback = await cache.match('/');
        if (rootFallback) {
          return rootFallback;
        }
      }

      // For all other failed requests (or if root isn't cached),
      // return a generic offline response.
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  fetchEvent.respondWith(respond());
});
