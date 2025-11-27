/**
 * @file modelDiscoveryService.ts
 * @service
 * @description
 * Implements logic for discovering and filtering available AI models from the provider (Gemini).
 * This service ensures that the application dynamically adapts to the user's available models
 * while filtering out unsupported or experimental models that could cause instability.
 */

import * as errorService from '$lib/core/services/errorService';

// NEW: A list of keywords to filter out unwanted, specialized, or internal models.
// This list can be easily updated in the future.
const EXCLUDED_KEYWORDS_IN_MODEL_ID = [
  'image', // Exclude image generation models
  'tts', // Exclude text-to-speech models
  'embedding', // Exclude embedding models
  'exp', // Exclude general experimental/internal models
  'thinking', // Exclude specific experimental models
  'learnlm', // Exclude other model families
  'gemma', // Exclude the Gemma model family
  'aqa', // Exclude Attributed Question Answering models
];

/**
 * Fetches the list of model IDs available from the Gemini API for a given key.
 *
 * This function performs a live query against the Gemini API to retrieve all models
 * accessible to the provided API key. It applies a rigorous set of filters to ensure
 * only text-generation models suitable for the application's use cases are returned.
 *
 * @param {string} apiKey - The user's Google AI (Gemini) API key.
 * @returns {Promise<Set<string>>} A promise that resolves to a Set of available model ID strings (e.g., 'gemini-pro').
 */
export async function fetchAvailableGeminiModels(
  apiKey: string
): Promise<Set<string>> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('Failed to fetch available models from Gemini API.');
      return new Set(); // Return an empty set on failure
    }

    const data = await response.json();
    const modelIds = new Set<string>();

    if (data.models) {
      for (const model of data.models) {
        const modelId = model.name.replace('models/', '');

        // --- INTELLIGENT FILTERING LOGIC ---

        // 1. Must support the 'generateContent' method we use.
        if (!model.supportedGenerationMethods?.includes('generateContent')) {
          continue; // Skip this model
        }

        // 2. Must be from the 'gemini' family.
        if (!modelId.startsWith('gemini')) {
          continue; // Skip models like 'gemma', 'learnlm', etc.
        }

        // 3. Must NOT contain any of our excluded keywords.
        const hasExcludedKeyword = EXCLUDED_KEYWORDS_IN_MODEL_ID.some(
          (keyword) => modelId.includes(keyword)
        );
        if (hasExcludedKeyword) {
          continue; // Skip this specialized/experimental model
        }

        // --- END FILTERING ---

        // If all checks pass, this is a model we want to show.
        modelIds.add(modelId);
      }
    }
    return modelIds;
  } catch (error) {
    errorService.reportError(error as Error, {
      context: 'ModelDiscoveryService',
      action: 'fetchAvailableGeminiModels',
    });
    return new Set(); // Return an empty set on error
  }
}
