// src/routes/api/tts/+server.ts

import { EdgeTTS } from '@andresaya/edge-tts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const text = url.searchParams.get('text');
  const voice = url.searchParams.get('voice') || 'en-US-JennyNeural';

  if (!text) {
    return new Response('Missing text parameter', { status: 400 });
  }

  try {
    const tts = new EdgeTTS();

    // ttsStream es un AsyncGenerator, no un EventEmitter de Node.
    const ttsStream = tts.synthesizeStream(text, voice);

    // Creamos un ReadableStream (el estándar web) a partir del AsyncGenerator.
    // Esto actúa como un "puente" entre los dos formatos.
    const webStream = new ReadableStream({
      async start(controller) {
        // La forma correcta de consumir un AsyncGenerator es con un bucle for await...of.
        for await (const chunk of ttsStream) {
          controller.enqueue(chunk); // Enviamos cada trozo de audio al cliente.
        }
        // Cuando el bucle termina, cerramos el stream.
        controller.close();
      },
    });

    // Enviamos el stream web directamente al cliente.
    return new Response(webStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[SERVER] CRITICAL ERROR:', error);
    return new Response('Error synthesizing speech', { status: 500 });
  }
};
