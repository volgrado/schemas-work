/**
 * @file aiModels.ts
 * @service
 *
 * @description
 * This service is the definitive source of truth for all supported AI models in the application.
 * It provides a list of officially supported models with their default configurations and,
 * crucially, includes a robust fallback mechanism to handle "Discovered Models"
 * (models that are not in the official list but may be available via the API).
 */

import type { Provider } from '$lib/types';

/**
 * Defines the core structure for an AI model configuration object.
 */
export interface AiModel {
  /** The unique identifier used in API calls (e.g., 'gemini-1.5-flash-latest') */
  id: string;
  /** The human-readable name for display in the UI (e.g., 'Gemini 1.5 Flash') */
  name: string;
  /** The provider of the model (e.g., 'gemini') */
  provider: Provider;
  /** The default requests-per-minute rate limit for this model. */
  rpm: number;
  /** The default requests-per-day rate limit for this model. */
  rpd: number;
  /** Optional description for the UI */
  description?: string;
  /** Optional context window size */
  contextWindow?: number;
  /** Optional capabilities list */
  capabilities?: string[];
  /** Optional premium flag */
  isPremium?: boolean;
}

/**
 * The official, curated list of pre-configured and supported AI models.
 * To add a new officially supported model, add its configuration here.
 */
export const SUPPORTED_MODELS: AiModel[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    rpm: 2,
    rpd: 50,
    description: 'State-of-the-art reasoning model.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    rpm: 10,
    rpd: 250,
    description: 'Balanced performance and speed.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'gemini',
    rpm: 15,
    rpd: 1000,
    description: 'Extremely fast, lightweight model.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    rpm: 15,
    rpd: 200,
    description: 'Previous generation fast model.'
  },
  {
    id: 'gemini-1.5-pro-latest',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    rpm: 2,
    rpd: 50,
    description: 'Legacy reasoning model.'
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    rpm: 15,
    rpd: 1500,
    description: 'Legacy fast model.'
  },

];

/**
 * Creates a temporary "Discovered Model" object on the fly.
 * This is used when a user has selected a model ID that is not in the official
 * SUPPORTED_MODELS list (e.g., a newly released model or a custom-entered name).
 *
 * @param modelId The ID of the discovered model.
 * @returns An `AiModel` object with a generated name and conservative default rate limits.
 * @internal
 */
export function createDiscoveredModel(modelId: string): AiModel {
  // Attempt to create a user-friendly name from the model ID.
  const name = modelId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: modelId,
    name: name,
    provider: 'gemini', // Assume all discovered models are Gemini for now.
    rpm: 1, // Use very conservative defaults for unknown models to be safe.
    rpd: 500,
  };
}

/**
 * Finds a model by its ID. This is the primary function for retrieving model configurations.
 *
 * CRITICAL FEATURE: If no officially supported model is found for the given ID,
 * this function gracefully falls back to creating a "Discovered Model" object.
 * This prevents the application from crashing and makes the system resilient to
 * custom or newly available model names.
 *
 * @param modelId The ID of the model to find.
 * @returns The corresponding `AiModel` object. It will never return null or undefined
 *          for a valid modelId string.
 */
export function getModelById(modelId: string): AiModel {
  // First, attempt to find the model in our official, curated list.
  const model = SUPPORTED_MODELS.find((m) => m.id === modelId);

  if (model) {
    return model;
  }

  // --- FALLBACK LOGIC ---
  // If the model is not in our official list, it's a "Discovered Model".
  // We create a temporary object for it on the fly to allow the application to proceed.
  console.warn(
    `Model ID "${modelId}" not found in supported list. Creating a discovered model object.`
  );
  return createDiscoveredModel(modelId);
}
