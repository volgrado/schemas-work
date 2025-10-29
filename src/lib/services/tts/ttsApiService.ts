/**
 * @file A dedicated service for interacting with the TTS backend API.
 * @module ttsApiService
 */

const API_BASE_URL = '/api/tts';

/**
 * Fetches an audio blob for a given text and voice.
 * @param text The text to synthesize.
 * @param voiceId The ID of the voice to use.
 * @param signal An AbortSignal to allow for request cancellation.
 * @returns A promise that resolves to an audio Blob.
 */
export async function fetchAudioForText(
  text: string,
  voiceId: string,
  signal: AbortSignal
): Promise<Blob> {
  const encodedText = encodeURIComponent(text);
  const url = `${API_BASE_URL}?text=${encodedText}&voice=${voiceId}`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TTS API Error (Status ${response.status})`);
  }
  return response.blob();
}
