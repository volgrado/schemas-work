/**
 * @file Manages the strategy for generating vector embeddings.
 * @module embeddingStrategies
 *
 * @remarks
 * This file implements the "Strategy Pattern" for embedding generation. It decouples
 * the core application logic (like the Neural Index) from the specific method
 * used to create embeddings (e.g., a cloud API vs. a local model).
 *
 * The core components are:
 * 1.  IEmbeddingStrategy: An interface that defines a universal contract for any embedding generator.
 * 2.  Concrete Strategies: Classes (like `GeminiCloudStrategy`) that implement the contract.
 * 3.  The Strategy Manager: A single function (`getEmbedding`) that the rest of the app calls.
 *     This manager is responsible for selecting and using the correct strategy based on
 *     application settings.
 *
 * This architecture allows us to add new embedding methods (like a local, on-device model)
 * in the future with minimal changes to the rest of the codebase. We would simply add a
 * new strategy class and update the manager's selection logic.
 */

import * as aiService from '$lib/services/ai/aiService';
import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';

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
 * This class fulfills the IEmbeddingStrategy contract by calling the Gemini API via our aiService.
 */
class GeminiCloudStrategy implements IEmbeddingStrategy {
  /**
   * Generates an embedding by delegating to the aiService's generateEmbedding function.
   * @param text The text to be embedded.
   * @returns A promise that resolves to the vector embedding.
   */
  async generate(text: string): Promise<number[]> {
    return await aiService.generateEmbedding(text);
  }
}

/**
 * STRATEGY 2: The Local On-Device Embedder (FUTURE IMPLEMENTATION)
 * This is a placeholder for our future work. It demonstrates how easily a new
 * strategy can be added. It currently throws an error if called.
 */
class LocalTransformerStrategy implements IEmbeddingStrategy {
  /**
   * (Not Implemented) This method will one day use a library like Transformers.js
   * to generate embeddings locally on the user's device.
   * @param text The text to be embedded.
   * @throws Error because this feature is not yet implemented.
   */
  async generate(text: string): Promise<number[]> {
    // In the future, this is where the logic for running a local model would go.
    // For now, it serves as a placeholder and a guard.
    console.error(
      'Local embedding strategy called but is not yet implemented.'
    );
    throw new Error('Local embedding strategy is not yet implemented.');
  }
}

// --- 3. The "Strategy Manager" (The Foreman) ---

/**
 * A private object that holds an instance of each available strategy.
 * This ensures we only create one instance of each class.
 * @internal
 */
const strategies = {
  cloud: new GeminiCloudStrategy(),
  local: new LocalTransformerStrategy(), // It's ready and waiting
};

/**
 * The single, public-facing function that the rest of the application will use
 * to generate an embedding. It abstracts away the "how".
 *
 * It reads the user's settings to determine which strategy to use ('cloud' or 'local'),
 * gets the appropriate strategy instance, and then calls its `generate` method.
 *
 * @param text The text to be embedded.
 * @returns A promise that resolves to the vector embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  // In the future, you will add a property to your settingsStore, e.g., 'embeddingMethod'.
  // const { embeddingMethod } = get(settingsStore);
  // For now, we hardcode the strategy to 'cloud' as per our plan.
  const chosenStrategy: 'cloud' | 'local' = 'cloud';

  const strategy = strategies[chosenStrategy];

  if (!strategy) {
    // This is a failsafe in case the setting is invalid. Default to the most reliable option.
    console.warn(
      `Invalid embedding strategy '${chosenStrategy}'. Defaulting to 'cloud'.`
    );
    return await strategies.cloud.generate(text);
  }

  return await strategy.generate(text);
}
