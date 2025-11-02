import { z } from 'zod';
import * as errorService from '$lib/services/core/errorService';
import type { AiModel } from './aiModels';
// --- NEW ---
import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
// --- ADDED ---
import { t } from '$lib/utils/i18n';

// --- NEW ---
// The official model name for the embedding generator.
const EMBEDDING_MODEL_ID = 'gemini-embedding-001';

// --- UNCHANGED ---
export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

// --- NEW FUNCTION ---
/**
 * Generates a vector embedding for a given piece of text using the Gemini API.
 * This function is used by the Neural Index to create "conceptual fingerprints".
 *
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers (the vector).
 * @throws {AiServiceError} If no API key is found or the API call fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Use the settings store to find any available Gemini key.
  // The embedding model is not user-selectable and has high rate limits,
  // so any valid key will do.
  const settings = get(settingsStore);
  const apiKey = settings.apiKeys.find((k) => k.provider === 'gemini');

  if (!apiKey) {
    throw new AiServiceError(
      get(t)('ai_service.errors.no_gemini_key_embedding')
    );
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL_ID}:embedContent?key=${apiKey.key}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL_ID}`,
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        get(t)('ai_service.errors.embedding_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const embedding = jsonResponse.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new AiServiceError(get(t)('ai_service.errors.no_valid_embedding'));
    }

    // Record usage to participate in rate-limiting and key rotation
    settingsStore.recordApiKeyUsage(apiKey.id);

    return embedding;
  } catch (error) {
    errorService.reportError(error, {
      operation: `aiService.generateEmbedding (Gemini)`,
    });
    if (error instanceof AiServiceError) {
      throw error;
    }
    throw new AiServiceError(
      get(t)('ai_service.errors.unexpected_embedding_error')
    );
  }
}

// --- UNCHANGED ---
/**
 * Sends a prompt to the Gemini API and returns the parsed, validated JSON response.
 *
 * @param prompt The full prompt to send to the AI.
 * @param model The AiModel object defining which model to use.
 * @param apiKey The user's Google AI (Gemini) API key.
 * @param validationSchema A Zod schema to validate the structure of the JSON response.
 * @returns The validated data from the AI response.
 * @throws {AiServiceError} If the API call fails, the response is not valid JSON, or validation fails.
 */
export async function generateContent<T extends z.ZodType<any, any>>(
  prompt: string,
  model: AiModel,
  apiKey: string,
  validationSchema: T
): Promise<z.infer<T>> {
  if (model.provider !== 'gemini') {
    throw new AiServiceError(
      get(t)('ai_service.errors.unsupported_provider', {
        provider: model.provider,
      })
    );
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        get(t)('ai_service.errors.gemini_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new AiServiceError(get(t)('ai_service.errors.no_content'));
    }

    const dataFromApi = JSON.parse(content);

    const validation = validationSchema.safeParse(dataFromApi);
    if (!validation.success) {
      errorService.reportError(validation.error, {
        operation: 'aiService.generateContent.zodValidation',
        dataFromApi: dataFromApi,
      });
      throw new AiServiceError(
        get(t)('ai_service.errors.validation_failed', {
          path: validation.error.issues[0].path.join('.'),
          message: validation.error.issues[0].message,
        })
      );
    }

    return validation.data;
  } catch (error) {
    errorService.reportError(error, {
      operation: `aiService.generateContent (Gemini)`,
    });
    if (error instanceof AiServiceError) {
      throw error;
    }
    throw new AiServiceError(
      get(t)('ai_service.errors.unexpected_generate_content_error')
    );
  }
}
