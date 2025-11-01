import { writable } from 'svelte/store';
import { browser } from '$app/environment';
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
  requests: { timestamp: number }[];
}

// NEW: Define the possible embedding strategies
export type EmbeddingMethod = 'cloud' | 'local';

export interface SettingsState {
  selectedModelId: string;
  apiKeys: ApiKey[];
  // NEW: Add a property to store the user's chosen embedding strategy.
  embeddingMethod: EmbeddingMethod;
}

const DEFAULT_STATE: SettingsState = {
  selectedModelId: 'gemini-1.5-flash-latest',
  apiKeys: [],
  // NEW: Default to 'cloud' for the highest quality experience out-of-the-box.
  embeddingMethod: 'cloud',
};

// --- Store Implementation ---

function createSettingsStore() {
  const getInitialState = (): SettingsState => {
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
        // Gracefully handle old settings objects that don't have the new property.
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
            requests: [],
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

  const isKeyRateLimited = (
    key: ApiKey,
    currentState: SettingsState
  ): boolean => {
    const model = getModelById(currentState.selectedModelId);
    if (!model || !key) return false;

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

    // --- NEW METHOD ---
    /**
     * Sets the preferred method for generating embeddings (for the Neural Index).
     * @param method The chosen embedding strategy.
     */
    setEmbeddingMethod: (method: EmbeddingMethod) => {
      update((state) => {
        // Here you could trigger the "catch-up" indexing logic if needed.
        // For now, we just update the state.
        console.log(`Embedding method changed to: ${method}`);
        const newState = { ...state, embeddingMethod: method };
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
          requests: [],
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

    recordApiKeyUsage: (keyId: string) => {
      update((state) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const newState = {
          ...state,
          apiKeys: state.apiKeys.map((k) => {
            if (k.id === keyId) {
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

    getNextAvailableKey: (
      provider: AiProvider,
      currentState: SettingsState
    ): ApiKey | null => {
      const providerKeys = currentState.apiKeys.filter(
        (k) => k.provider === provider
      );
      if (providerKeys.length === 0) return null;

      providerKeys.sort((a, b) => a.lastUsed - b.lastUsed);

      for (const key of providerKeys) {
        if (!isKeyRateLimited(key, currentState)) {
          return key;
        }
      }

      return null;
    },
  };
}

export const settingsStore = createSettingsStore();
