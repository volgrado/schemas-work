/**
 * @file Manages the strategy for generating vector embeddings.
 * @module embeddingStrategies
 *
 * @remarks
 * This file implements the "Strategy Pattern" for embedding generation. It decouples
 * the core application logic (like the Neural Index) from the specific method
 * used to create embeddings (e.g., a cloud API vs. a local model).
 */

// import * as aiService from '$lib/services/ai/aiService'; // Removed in favor of dynamic import
import {
  settingsState,
  getNextAvailableKey,
  recordApiKeyUsage,
} from '$lib/stores/settingsStore.svelte';

// --- 1. The "Strategy" Interface (The Contract) ---

/**
 * The universal interface for any embedding generation strategy.
 * Every strategy, whether local or cloud-based, MUST implement this function signature.
 */
export interface IEmbeddingStrategy {
  generate(text: string): Promise<number[]>;
}

// --- 2. The Concrete "Strategies" (The Workers) ---

/**
 * STRATEGY 1: The Cloud-Based Gemini Embedder
 * Fulfills the IEmbeddingStrategy contract by calling the Gemini API via our aiService.
 */
class GeminiCloudStrategy implements IEmbeddingStrategy {
  async generate(text: string): Promise<number[]> {
    const apiKeyObject = getNextAvailableKey('gemini');

    if (!apiKeyObject) {
      throw new Error(
        'No available Gemini API key. Please add a key in settings or wait for the rate limit to expire.'
      );
    }

    try {
      // Dynamic import to avoid bundling aiService in the main chunk
      const aiService = await import('$lib/services/ai/aiService');
      const embedding = await aiService.generateEmbedding(
        text,
        apiKeyObject.key
      );
      recordApiKeyUsage(apiKeyObject.id);
      return embedding;
    } catch (error) {
      console.error(
        `Embedding generation failed with key: ${apiKeyObject.nickname || apiKeyObject.id}`
      );
      throw error;
    }
  }
}

/**
 * STRATEGY 2: The Local On-Device Embedder (FUTURE IMPLEMENTATION)
 * A placeholder for future on-device model integration.
 */
class LocalTransformerStrategy implements IEmbeddingStrategy {
  async generate(text: string): Promise<number[]> {
    console.error(
      'Local embedding strategy called but is not yet implemented.'
    );
    throw new Error('Local embedding strategy is not yet implemented.');
  }
}

// --- 3. The "Strategy Manager" (The Foreman) ---

const strategies = {
  cloud: new GeminiCloudStrategy(),
  local: new LocalTransformerStrategy(),
};

/**
 * The single, public-facing function that the rest of the application will use
 * to generate an embedding. It dynamically selects and executes the correct strategy
 * based on the user's current settings.
 *
 * @param text The text to be embedded.
 * @returns A promise that resolves to the vector embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const { embeddingMethod } = settingsState;

  const strategy = strategies[embeddingMethod];

  if (!strategy) {
    console.warn(
      `Invalid embedding strategy '${embeddingMethod}'. Defaulting to 'cloud'.`
    );
    return await strategies.cloud.generate(text);
  }

  return await strategy.generate(text);
}
