/**
 * @file aiService.ts
 * @service
 *
 * @description
 * This service provides a centralized, robust interface for all interactions with external
 * Generative AI models. It is the sole gateway for content generation and includes a
 * critical, self-healing retry mechanism to handle AI-generated validation errors.
 * It also intelligently handles multimodal inputs, including large files via the File API.
 */

import { z } from 'zod';
import * as errorService from '$lib/services/core/errorService';
import type { AiModel } from './aiModels';
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import { AiValidationError } from './AiValidationError';
import { fileToBase64 } from '$lib/utils/fileUtils';

// --- CONSTANTS ---
// The threshold for switching to the File API. Set slightly below 20MB to be safe.
const INLINE_FILE_SIZE_LIMIT_BYTES = 19.5 * 1024 * 1024;
// The Gemini File API's absolute maximum file size.
const FILE_API_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;

/** Defines a part of a multimodal message for the AI. */
export type AiMessagePart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { file_data: { mime_type: string; file_uri: string } };

/** Defines the structure for a message in a multi-turn conversation with the AI. */
export type AiMessage = {
  role: 'user' | 'model';
  parts: AiMessagePart[];
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
  const _t = get(t);

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
 * @private
 * Uploads a file using the Gemini File API.
 * WARNING: In a real production application, this sensitive API call should be
 * proxied through your own backend server to protect your API key.
 * @param file The file to upload.
 * @param apiKey The Gemini API key.
 * @returns The unique name/identifier of the uploaded file (e.g., "files/12345abc").
 */
async function uploadFile(file: File, apiKey: string): Promise<string> {
  const _t = get(t);
  const uploadUrl = `https://generativelanguage.googleapis.com/v1beta/files?key=${apiKey}`;

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
      _t('ai_service.errors.file_api_upload_failed', {
        message: errorBody.error?.message || 'Unknown file upload error',
      })
    );
  }

  const result = await response.json();
  return result.file.name;
}

/**
 * Sends a conversational history (potentially with a file) to the Gemini API.
 * It automatically chooses the correct method (inline vs. File API) based on file size.
 */
export async function generateContent<T extends z.ZodType<any, any>>(
  messages: AiMessage[],
  model: AiModel,
  apiKey: string,
  validationSchema: T,
  file: File | null = null,
  retries = 1
): Promise<z.infer<T>> {
  const _t = get(t);

  if (model.provider !== 'gemini') {
    throw new AiServiceError(
      _t('ai_service.errors.unsupported_provider', { provider: model.provider })
    );
  }

  const finalParts: AiMessagePart[] = [...(messages[0]?.parts || [])];

  if (file) {
    if (file.size > FILE_API_SIZE_LIMIT_BYTES) {
      throw new AiServiceError(
        _t('ai_service.errors.file_too_large_hard_limit', {
          limit: FILE_API_SIZE_LIMIT_BYTES / (1024 * 1024),
        })
      );
    }

    if (file.size > INLINE_FILE_SIZE_LIMIT_BYTES) {
      const fileName = await uploadFile(file, apiKey);
      finalParts.unshift({
        file_data: { mime_type: file.type, file_uri: fileName },
      });
    } else {
      const base64Data = await fileToBase64(file);
      finalParts.unshift({
        inline_data: { mime_type: file.type, data: base64Data },
      });
    }
  }

  const finalMessages: AiMessage[] = [{ role: 'user', parts: finalParts }];
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;
  let lastResponseText = '';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: finalMessages,
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

      // Create a text-only version of the original conversation for the retry.
      const retryConversation: AiMessage[] = JSON.parse(
        JSON.stringify(messages)
      );
      const lastMessage = retryConversation[retryConversation.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        lastMessage.parts = lastMessage.parts.filter(
          (part: AiMessagePart) => 'text' in part
        );
      }

      const fullRetryMessages: AiMessage[] = [
        ...retryConversation,
        failedResponse,
        correctionMessage,
      ];

      return generateContent(
        fullRetryMessages,
        model,
        apiKey,
        validationSchema,
        null, // Do not include the file in the retry
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
