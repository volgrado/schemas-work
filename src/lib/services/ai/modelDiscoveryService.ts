// src/lib/services/ai/modelDiscoveryService.ts

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
 * This function is used to validate our statically defined models.
 *
 * @param apiKey The user's Google AI (Gemini) API key.
 * @returns A Set of available model ID strings (e.g., 'gemini-pro').
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
    console.error('Error during model discovery:', error);
    return new Set(); // Return an empty set on error
  }
}
