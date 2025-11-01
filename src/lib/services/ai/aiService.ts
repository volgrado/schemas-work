// src/lib/services/ai/aiService.ts

import { z } from 'zod';
import * as errorService from '$lib/services/core/errorService';
import type { AiModel } from './aiModels';

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

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
  // SIMPLIFIED: No need for a router, we call the Gemini API directly.
  if (model.provider !== 'gemini') {
    throw new AiServiceError(`Unsupported AI provider: ${model.provider}`);
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
        `Gemini API Error: ${response.status} - ${
          errorBody.error?.message || 'Unknown API error'
        }`
      );
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new AiServiceError('Gemini response did not contain any content.');
    }

    const dataFromApi = JSON.parse(content);

    const validation = validationSchema.safeParse(dataFromApi);
    if (!validation.success) {
      errorService.reportError(validation.error, {
        operation: 'aiService.generateContent.zodValidation',
        dataFromApi: dataFromApi,
      });
      throw new AiServiceError(
        `AI response validation failed: ${validation.error.issues[0].path.join('.')} - ${
          validation.error.issues[0].message
        }`
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
      'An unexpected error occurred while contacting the AI service.'
    );
  }
}
