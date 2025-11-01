// src/lib/services/ai/aiModels.ts

export type AiProvider = 'gemini';

export interface AiModel {
  id: string;
  name: string;
  provider: AiProvider;
  rateLimits: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
}

// A conservative default for unknown models.
const DEFAULT_RATE_LIMITS = { rpm: 2, tpm: 100_000, rpd: 50 };

export const supportedModels: AiModel[] = [
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    rateLimits: { rpm: 10, tpm: 250_000, rpd: 250 },
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 1.0 Pro',
    provider: 'gemini',
    rateLimits: { rpm: 2, tpm: 125_000, rpd: 50 },
  },
];

export function getModelById(modelId: string): AiModel | undefined {
  return supportedModels.find((m) => m.id === modelId);
}

// NEW: A factory function to create a placeholder for a discovered model.
export function createDiscoveredModel(modelId: string): AiModel {
  // Create a user-friendly name from the ID, e.g., "gemini-1.5-pro-latest" -> "Gemini 1.5 Pro Latest"
  const prettyName = modelId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: modelId,
    name: `${prettyName} *`, // Add an asterisk to indicate it's discovered
    provider: 'gemini',
    rateLimits: DEFAULT_RATE_LIMITS, // Apply conservative defaults
  };
}
