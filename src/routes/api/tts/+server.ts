// src/routes/api/tts/+server.ts

import { EdgeTTS } from '@andresaya/edge-tts';
import type { RequestHandler } from './$types';

export const config = {
  runtime: 'edge',
};

export const GET: RequestHandler = async ({ url }) => {
  // --- THIS IS THE CORRECTED LINE ---
  const text = url.searchParams.get('text');
  const voice = url.searchParams.get('voice') || 'en-US-JennyNeural';
  // --- END OF CORRECTION ---

  if (!text) {
    return new Response('Missing text parameter', { status: 400 });
  }

  try {
    // Step 1: Create the instance with no arguments.
    const tts = new EdgeTTS();

    // Step 2: Set the audio format as a property on the instance.
    (tts as any).audioFormat = 'webm-24khz-16bit-mono-opus';

    // Step 3: Now, call the synthesize method.
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
        'Content-Type': 'audio/webm; codecs=opus',
      },
    });
  } catch (error) {
    console.error('[TTS API @ Edge] Error synthesizing speech:', error);
    return new Response('Error synthesizing speech', { status: 500 });
  }
};
