// src/routes/api/tts/+server.ts

import { EdgeTTS } from '@andresaya/edge-tts';
import type { RequestHandler } from './$types';

// --- THIS IS THE CORRECTED SYNTAX ---
/**
 * Route-specific configuration.
 * By setting `runtime` to 'edge', we instruct the hosting platform
 * (Vercel, Netlify, etc.) to run this endpoint on their global Edge Network.
 * This is the key to bypassing the IP blocking issue.
 */
export const config = {
  runtime: 'edge',
};
// ------------------------------------

export const GET: RequestHandler = async ({ url }) => {
  const text = url.searchParams.get('text');
  const voice = url.searchParams.get('voice') || 'en-US-JennyNeural';

  if (!text) {
    return new Response('Missing text parameter', { status: 400 });
  }

  try {
    const tts = new EdgeTTS();

    const ttsStream = tts.synthesizeStream(text, voice);

    const webStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of ttsStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('[TTS API @ Edge] Error synthesizing speech:', error);
    return new Response('Error synthesizing speech', { status: 500 });
  }
};
