/**
 * @file geminiProvider.ts
 * @module services.ai.providers
 * @description
 * Handles direct communication with the Google Gemini API.
 * Responsible for raw HTTP requests, URL construction, and error handling.
 */

import { i18n } from '$lib/utils/i18n.svelte';
import { AiServiceError } from '../aiService';

export class GeminiProvider {
  private static readonly BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta';

  /**
   * Generates a vector embedding for the given text.
   */
  static async generateEmbedding(
    text: string,
    apiKey: string
  ): Promise<number[]> {
    const modelId = 'gemini-embedding-001';
    const apiUrl = `${this.BASE_URL}/models/${modelId}:embedContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        i18n.t('ai_service.errors.gemini_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown embedding API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const embedding = jsonResponse.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new AiServiceError(i18n.t('ai_service.errors.no_embedding'));
    }

    return embedding;
  }

  /**
   * Uploads a file using the Gemini File API.
   */
  static async uploadFile(file: File, apiKey: string): Promise<string> {
    const uploadUrl = `${this.BASE_URL}/files?key=${apiKey}`;
    const formData = new FormData();

    // Part 1: The metadata as a JSON Blob
    const metadata = { file: { display_name: file.name } };
    formData.append(
      'file',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );

    // Part 2: The actual file content
    formData.append('file', file, file.name);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        i18n.t('ai_service.errors.file_api_upload_failed', {
          message: errorBody.error?.message || 'Unknown file upload error',
        })
      );
    }

    const result = await response.json();
    return result.file.name;
  }

  /**
   * Generates content using the specified model.
   */
  static async generateContent(
    modelId: string,
    payload: any,
    apiKey: string
  ): Promise<string> {
    const apiUrl = `${this.BASE_URL}/models/${modelId}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AiServiceError(
        i18n.t('ai_service.errors.gemini_api_error', {
          status: response.status,
          message: errorBody.error?.message || 'Unknown API error',
        })
      );
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new AiServiceError(i18n.t('ai_service.errors.no_content'));
    }

    return content;
  }
}
