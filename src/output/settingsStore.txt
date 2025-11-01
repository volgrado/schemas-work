// src/lib/stores/settingsStore.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
// NEW: Import the model definitions to access rate limits
import { getModelById, type AiProvider } from '$lib/services/ai/aiModels';

// --- Constants ---
const SETTINGS_STORAGE_KEY = 'schemas-work-settings-v2';
const OLD_API_KEY_STORAGE_KEY = 'schemas-work-api-key';

// --- Type Definitions ---

export interface ApiKey {
  id: string;
  key: string;
  provider: AiProvider;
  lastUsed: number;
  nickname?: string;
  // NEW: An array to store timestamps of recent requests for rate-limit tracking.
  requests: { timestamp: number }[];
}

export interface SettingsState {
  selectedModelId: string;
  apiKeys: ApiKey[];
}

const DEFAULT_STATE: SettingsState = {
  selectedModelId: 'gemini-1.5-flash-latest',
  apiKeys: [],
};

// --- Store Implementation ---

function createSettingsStore() {
  const getInitialState = (): SettingsState => {
    if (!browser) return DEFAULT_STATE;

    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        // NEW: Ensure old keys without the `requests` property are gracefully handled.
        if (parsed.apiKeys) {
          parsed.apiKeys = parsed.apiKeys.map((key: any) => ({
            requests: [], // Add the default empty array if missing
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
      console.log('Migrating old API key to new format...');
      const migratedState: SettingsState = {
        ...DEFAULT_STATE,
        apiKeys: [
          {
            id: crypto.randomUUID(),
            key: oldApiKey,
            provider: 'gemini',
            lastUsed: 0,
            nickname: 'Migrated Key',
            requests: [], // MODIFIED: Include the new property
          },
        ],
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migratedState));
      localStorage.removeItem(OLD_API_KEY_STORAGE_KEY);
      return migratedState;
    }

    return DEFAULT_STATE;
  };

  const store = writable<SettingsState>(getInitialState());
  const { subscribe, update } = store;

  const saveState = (state: SettingsState) => {
    if (browser) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
    }
  };

  // NEW: The core rate-limiting logic.
  const isKeyRateLimited = (
    key: ApiKey,
    currentState: SettingsState
  ): boolean => {
    const model = getModelById(currentState.selectedModelId);
    if (!model || !key) return false; // Fail open if model not found

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const requestsInLastMinute = key.requests.filter(
      (r) => r.timestamp > oneMinuteAgo
    ).length;
    if (requestsInLastMinute >= model.rateLimits.rpm) {
      console.warn(`Key ${key.nickname || key.id} is rate-limited (RPM).`);
      return true;
    }

    const requestsInLastDay = key.requests.filter(
      (r) => r.timestamp > oneDayAgo
    ).length;
    if (requestsInLastDay >= model.rateLimits.rpd) {
      console.warn(`Key ${key.nickname || key.id} is rate-limited (RPD).`);
      return true;
    }

    return false;
  };

  return {
    subscribe,

    selectModel: (modelId: string) => {
      update((state) => {
        const newState = { ...state, selectedModelId: modelId };
        saveState(newState);
        return newState;
      });
    },

    addApiKey: (key: string, provider: AiProvider, nickname?: string) => {
      update((state) => {
        const newKey: ApiKey = {
          id: crypto.randomUUID(),
          key,
          provider,
          lastUsed: 0,
          nickname,
          requests: [], // MODIFIED: Initialize with an empty requests array
        };
        const newState = { ...state, apiKeys: [...state.apiKeys, newKey] };
        saveState(newState);
        return newState;
      });
    },

    removeApiKey: (keyId: string) => {
      update((state) => {
        const newState = {
          ...state,
          apiKeys: state.apiKeys.filter((k) => k.id !== keyId),
        };
        saveState(newState);
        return newState;
      });
    },

    // MODIFIED: This function now also records the request timestamp.
    recordApiKeyUsage: (keyId: string) => {
      update((state) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const newState = {
          ...state,
          apiKeys: state.apiKeys.map((k) => {
            if (k.id === keyId) {
              // Add new request and clean up old ones (older than 24h)
              const updatedRequests = [
                ...k.requests.filter((r) => r.timestamp > oneDayAgo),
                { timestamp: Date.now() },
              ];
              return { ...k, lastUsed: Date.now(), requests: updatedRequests };
            }
            return k;
          }),
        };
        saveState(newState);
        return newState;
      });
    },

    // MODIFIED: The "smart switch" logic now includes rate-limit checking.
    getNextAvailableKey: (
      provider: AiProvider,
      currentState: SettingsState
    ): ApiKey | null => {
      const providerKeys = currentState.apiKeys.filter(
        (k) => k.provider === provider
      );
      if (providerKeys.length === 0) return null;

      // Sort by lastUsed timestamp to prioritize rotation
      providerKeys.sort((a, b) => a.lastUsed - b.lastUsed);

      // Find the first key that is NOT rate-limited
      for (const key of providerKeys) {
        if (!isKeyRateLimited(key, currentState)) {
          return key; // Found a valid key
        }
      }

      // If the loop completes, all keys for this provider are currently rate-limited
      return null;
    },
  };
}

export const settingsStore = createSettingsStore();
