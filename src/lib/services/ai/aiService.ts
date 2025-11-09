/**
 * @file aiService.ts
 * @service
 *
 * @description
 * This service provides a centralized, robust interface for all interactions with external
 * Generative AI models. It is the sole gateway for content generation and includes a
 * critical, self-healing retry mechanism to handle AI-generated validation errors.
 */

import { z } from 'zod';
import * as errorService from '$lib/services/core/errorService';
import type { AiModel } from './aiModels';
// REFINEMENT: Keep the correct `get` import for the non-Rune i18n store.
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import { AiValidationError } from './AiValidationError';

/** Defines the structure for a message in a multi-turn conversation with the AI. */
export type AiMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

/** Custom error class for AI service-specific issues, allowing for precise user feedback. */
export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

/**
 * Makes a direct API call to the Gemini service to generate a vector embedding.
 * @param text The text content to embed.
 * @param apiKey The user's API key for authentication.
 * @returns A promise that resolves to an array of numbers representing the vector embedding.
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const modelId = 'gemini-embedding-001';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:embedContent?key=${apiKey}`;
  const _t = get(t); // Get the translation function once.

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        _t('ai_service.errors.gemini_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown embedding API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const embedding = jsonResponse.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new AiServiceError(_t('ai_service.errors.no_embedding'));
    }

    return embedding;
  } catch (error) {
    errorService.reportError(error, {
      operation: 'aiService.generateEmbedding',
    });
    if (error instanceof AiServiceError) throw error;
    throw new AiServiceError(
      _t('ai_service.errors.unexpected_embedding_error')
    );
  }
}

/**
 * Sends a conversational history to the Gemini API and returns the parsed,
 * validated JSON response. Includes a self-healing retry mechanism.
 *
 * @param messages The conversation history to send to the AI.
 * @param model The AI model object to use.
 * @param apiKey The user's API key.
 * @param validationSchema The Zod schema to validate the AI's response against.
 * @param retries The number of times to automatically retry on a validation failure.
 * @returns A promise that resolves to the validated, typed data from the AI response.
 */
export async function generateContent<T extends z.ZodType<any, any>>(
  messages: AiMessage[],
  model: AiModel,
  apiKey: string,
  validationSchema: T,
  retries = 1
): Promise<z.infer<T>> {
  const _t = get(t);

  if (model.provider !== 'gemini') {
    throw new AiServiceError(
      _t('ai_service.errors.unsupported_provider', { provider: model.provider })
    );
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;
  let lastResponseText = '';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: { response_mime_type: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        _t('ai_service.errors.gemini_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    lastResponseText = content || '';

    if (!content) {
      throw new AiServiceError(_t('ai_service.errors.no_content'));
    }

    const dataFromApi = JSON.parse(content);
    const validation = validationSchema.safeParse(dataFromApi);

    if (!validation.success) {
      throw new AiValidationError(validation.error);
    }

    return validation.data;
  } catch (error) {
    // --- SELF-HEALING BLOCK ---
    if (error instanceof AiValidationError && retries > 0) {
      console.warn(
        `AI response failed validation. Retrying... (${retries} retries left)`
      );
      const correctionMessage: AiMessage = {
        role: 'user',
        parts: [
          {
            text: `Your previous response was not valid. Please analyze your response, correct the formatting error, and return only the perfectly valid JSON object. The validation error was: ${error.message}`,
          },
        ],
      };
      const failedResponse: AiMessage = {
        role: 'model',
        parts: [{ text: lastResponseText }],
      };
      return generateContent(
        [...messages, failedResponse, correctionMessage],
        model,
        apiKey,
        validationSchema,
        retries - 1
      );
    }

    errorService.reportError(error, { operation: 'aiService.generateContent' });
    if (error instanceof AiServiceError || error instanceof AiValidationError)
      throw error;
    throw new AiServiceError(
      _t('ai_service.errors.unexpected_generate_content_error')
    );
  }
}
