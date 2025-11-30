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
  /**
   * Generates content using the specified model with streaming.
   * Yields chunks of text as they arrive.
   */
  static async *streamGenerateContent(
    modelId: string,
    payload: any,
    apiKey: string
  ): AsyncGenerator<string, void, unknown> {
    const apiUrl = `${this.BASE_URL}/models/${modelId}:streamGenerateContent?key=${apiKey}`;

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

    if (!response.body) {
      throw new AiServiceError(i18n.t('ai_service.errors.no_content'));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Gemini streams a JSON array: [{...}, {...}]
        // But in streaming mode, it sends chunks that might contain multiple JSON objects or partials.
        // Actually, the stream endpoint returns a series of JSON objects, usually formatted as a list if viewed as a whole,
        // but over the wire it's often just concatenated JSON objects or comma-separated.
        // Wait, standard Gemini REST stream returns a JSON array structure incrementally.
        // Typically: '[' ... ',' ... ',' ... ']'
        // Parsing this manually is tricky.
        // EASIER STRATEGY: Look for "text": "..." fields in the raw buffer if possible, OR
        // Use a simpler approach: Accumulate and try to parse known complete objects.
        
        // Let's assume standard behavior: It returns valid JSON objects representing chunks.
        // Actually, for `streamGenerateContent`, it returns a stream of `GenerateContentResponse` objects.
        
        // Simple parsing for now:
        // We will yield the raw text found in "text" fields.
        
        // Regex to find "text": "..."
        // This is hacky but robust for streaming without a full parser.
        // A better way is to accumulate valid JSON blocks.
        
        // Let's try to parse complete JSON objects from the buffer.
        // The stream usually sends `[{...},\n` or similar.
        
        // For this implementation, let's just yield the raw text if we can find it, 
        // or better, let's use a library if available, but we don't have one.
        
        // Let's try to extract text using regex from the current chunk + buffer.
        // Note: This might miss split unicode characters or split JSON tokens.
        
        // Alternative: Just return the raw chunk and let the caller handle it? No, we want to abstract the provider.
        
        // Let's use a simple bracket counter to find complete JSON objects.
        let braceCount = 0;
        let startIndex = 0;
        let inString = false;
        let escape = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              if (braceCount === 0) startIndex = i;
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                // Found a complete object
                const jsonStr = buffer.substring(startIndex, i + 1);
                try {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) yield text;
                  
                  // Advance buffer
                  buffer = buffer.substring(i + 1);
                  i = -1; // Reset loop for new buffer
                } catch (e) {
                  // Ignore parse errors, maybe it wasn't a full object yet or just noise
                }
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
