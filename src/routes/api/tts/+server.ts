/**
 * @file SvelteKit edge function for synthesizing speech using Microsoft's Edge TTS.
 * This endpoint streams audio data and is heavily cached at the edge for performance.
 * @module /api/tts
 */

import { EdgeTTS } from '@andresaya/edge-tts';
import type { RequestHandler } from './$types';

// --- Configuration ---
export const config = {
  runtime: 'edge', // Specify the Vercel/Cloudflare edge runtime.
};

// --- Constants for maintainability ---
const AUDIO_FORMAT = 'webm-24khz-16bit-mono-opus';
const CONTENT_TYPE = 'audio/webm; codecs=opus';
const DEFAULT_VOICE = 'en-US-JennyNeural';
const MAX_TEXT_LENGTH = 1000; // A sensible limit to prevent abuse.

/**
 * Handles GET requests to synthesize text to speech.
 * @param {URL} url - The request URL object.
 * @returns {Response} A streaming response with the audio data or a JSON error.
 */
export const GET: RequestHandler = async ({ url }) => {
  const text = url.searchParams.get('text');
  const voice = url.searchParams.get('voice') || DEFAULT_VOICE;

  // --- Robust Input Validation ---
  if (!text) {
    return new Response(
      JSON.stringify({ error: 'Missing "text" parameter.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
      }),
      {
        status: 413, // "Payload Too Large"
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // --- FIX 1: Revert to setting property after instantiation ---
    // The library's types indicate a zero-argument constructor. We use `any`
    // as a pragmatic way to set the undocumented `audioFormat` property.
    const tts = new EdgeTTS();
    (tts as any).audioFormat = AUDIO_FORMAT;
    const ttsStream = tts.synthesizeStream(text, voice);

    // --- FIX 2: Revert to the universally compatible ReadableStream constructor ---
    // This works in all environments, regardless of the tsconfig `lib` settings.
    const webStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of ttsStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    // --- Caching and Response ---
    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      `[TTS API @ Edge] Failed to synthesize text "${text.substring(0, 50)}...":`,
      err.message
    );

    // --- Structured JSON Error Response ---
    return new Response(
      JSON.stringify({ error: 'Failed to synthesize speech.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store', // Ensure errors are not cached.
        },
      }
    );
  }
};
