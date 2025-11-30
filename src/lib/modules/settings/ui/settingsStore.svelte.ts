// src/lib/stores/settingsStore.svelte.ts
/**
 * @file Manages user-configurable settings using Svelte 5 Runes.
 * @store
 */

import { browser } from '$app/environment';
import { getModelById, type AiModel } from '$lib/modules/ai/aiModels';
import type { Provider } from '$lib/types';

// --- Constants ---
const SETTINGS_STORAGE_KEY = 'schemas-work-settings-v2';
const OLD_API_KEY_STORAGE_KEY = 'schemas-work-api-key';

// --- Type Definitions ---
export interface ApiKey {
  id: string;
  key: string;
  provider: Provider;
  lastUsed: number;
  nickname?: string;
  requests: { timestamp: number }[];
}
export type EmbeddingMethod = 'cloud' | 'local';
export interface SettingsState {
  selectedModelId: string;
  apiKeys: ApiKey[];
  embeddingMethod: EmbeddingMethod;
}

// --- Initial State and Migration Logic ---
const DEFAULT_STATE: SettingsState = {
  selectedModelId: 'gemini-1.5-flash-latest',
  apiKeys: [],
  embeddingMethod: 'cloud',
};

function getInitialState(): SettingsState {
  if (!browser) return DEFAULT_STATE;

  const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);
      if (parsed.apiKeys) {
        parsed.apiKeys = parsed.apiKeys.map((key: any) => ({
          requests: [],
          ...key,
        }));
      }
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return DEFAULT_STATE;
    }
  }

  const oldApiKey = localStorage.getItem(OLD_API_KEY_STORAGE_KEY);
  if (oldApiKey) {
    console.log('Migrating old API key...');
    const migratedState: SettingsState = {
      ...DEFAULT_STATE,
      apiKeys: [
        {
          id: crypto.randomUUID(),
          key: oldApiKey,
          provider: 'gemini',
          lastUsed: 0,
          nickname: 'Migrated Key',
          requests: [],
        },
      ],
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migratedState));
    localStorage.removeItem(OLD_API_KEY_STORAGE_KEY);
    return migratedState;
  }

  return DEFAULT_STATE;
}

// $state at the top level is CORRECT in a .svelte.ts file.
export const settingsState = $state<SettingsState>(getInitialState());

// FIX: REMOVE the top-level $effect. It will be moved to +layout.svelte.

// --- Private Helper Functions ---
function isKeyRateLimited(key: ApiKey, model: AiModel): boolean {
  return false;
}

// --- Public Action Functions (These are all correct) ---
export function selectModel(modelId: string): void {
  settingsState.selectedModelId = modelId;
}

export function setEmbeddingMethod(method: EmbeddingMethod): void {
  settingsState.embeddingMethod = method;
}

export function addApiKey(
  key: string,
  provider: Provider,
  nickname?: string
): void {
  const newKey: ApiKey = {
    id: crypto.randomUUID(),
    key,
    provider,
    lastUsed: 0,
    nickname: nickname || undefined,
    requests: [],
  };
  settingsState.apiKeys.push(newKey);
}

export function removeApiKey(keyId: string): void {
  const keyIndex = settingsState.apiKeys.findIndex((k) => k.id === keyId);
  if (keyIndex > -1) {
    settingsState.apiKeys.splice(keyIndex, 1);
  }
}

export function recordApiKeyUsage(keyId: string): void {
  const key = settingsState.apiKeys.find((k) => k.id === keyId);
  if (key) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    key.requests = [
      ...key.requests.filter((r) => r.timestamp > oneDayAgo),
      { timestamp: Date.now() },
    ];
    key.lastUsed = Date.now();
  }
}

export function getNextAvailableKey(provider: Provider): ApiKey | null {
  const model = getModelById(settingsState.selectedModelId);
  if (!model) return null;

  if (model.provider === 'local-gemma-3n') {
    return {
      id: 'local-dummy-key',
      key: 'local',
      provider: 'local-gemma-3n',
      lastUsed: Date.now(),
      requests: []
    };
  }

  const providerKeys = settingsState.apiKeys
    .filter((k) => k.provider === provider)
    .sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));

  return providerKeys.find((key) => !isKeyRateLimited(key, model)) || null;
}
