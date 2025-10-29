// src/routes/api/tts/+server.ts

import { EdgeTTS } from '@andresaya/edge-tts';
import type { RequestHandler } from './$types';

export const config = {
  runtime: 'edge',
};

// The 'event' object contains helpers, including setHeaders for caching.
export const GET: RequestHandler = async (event) => {
  const { url } = event; // Destructure url from event

  const text = url.searchParams.get('text');
  const voice = url.searchParams.get('voice') || 'en-US-JennyNeural';

  if (!text) {
    return new Response('Missing text parameter', { status: 400 });
  }

  try {
    const tts = new EdgeTTS();
    (tts as any).audioFormat = 'webm-24khz-16bit-mono-opus';
    const ttsStream = tts.synthesizeStream(text, voice);
    const webStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of ttsStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    // --- THIS IS THE FIX ---
    // Set caching headers. This tells the Edge CDN to cache this response.
    // The key is the full URL, including the text and voice.
    // 'public' means it can be cached by shared caches (the CDN).
    // 'max-age=31536000' tells the browser/CDN to cache it for one year.
    // 'immutable' tells caches that this response will never change.
    event.setHeaders({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'audio/webm; codecs=opus',
    });
    // --- END OF FIX ---

    // Return the Response without headers here, as setHeaders handles it.
    return new Response(webStream);
  } catch (error) {
    console.error('[TTS API @ Edge] Error synthesizing speech:', error);
    // Also add a cache-control header for errors so they aren't cached.
    event.setHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    return new Response('Error synthesizing speech', { status: 500 });
  }
};
