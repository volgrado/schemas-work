// src/lib/services/features/commandService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writable, get } from 'svelte/store';

// Import all necessary types
import type { Command } from '$lib/types';
import type { EditorStoreState } from '$lib/stores/editorStore';

// --- MOCK DEPENDENCIES ---
// Cada factory function es completamente autocontenida para evitar problemas de hoisting.

vi.mock('$lib/stores/commandBarStore', () => {
  const state = writable({});
  return {
    commandBarStore: {
      subscribe: state.subscribe,
      set: state.set, // Expuesto solo para test
      get: () => get(state),
      setView: vi.fn(),
      openAiHelper: vi.fn(),
      openPasswordModal: vi.fn(),
      openDiagnosticModal: vi.fn(),
      close: vi.fn(),
    },
  };
});

vi.mock('$lib/stores/reviewStore', () => {
  const state = writable({ isReviewing: false });
  return {
    reviewStore: {
      subscribe: state.subscribe,
      set: state.set, // Expuesto solo para test
      get: () => get(state),
      startReview: vi.fn(),
    },
  };
});

vi.mock('$lib/stores/ttsStore', () => {
  const state = writable({ status: 'idle' });
  return {
    ttsStore: {
      subscribe: state.subscribe,
      set: state.set, // Expuesto solo para test
      get: () => get(state),
      startReading: vi.fn(),
    },
  };
});

vi.mock('$lib/stores/documentStore', () => ({
  documentStore: {
    createNewDocument: vi.fn(),
  },
}));

vi.mock('$lib/stores/editorStore', () => {
  const defaultState: EditorStoreState = {
    instance: null,
    selectedNode: null,
    selectedNodePos: null,
    contentVersion: 0,
    doc: null,
  };
  const state = writable(defaultState);
  return {
    editorStore: {
      subscribe: state.subscribe,
      set: state.set, // Expuesto solo para test
      get: () => get(state),
    },
  };
});

vi.mock('$lib/utils/i18n', () => ({
  t: writable((key: string) => key.split('.').pop()?.replace(/_/g, ' ')),
}));

// Importaciones reales DESPUÉS de los mocks
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { getCommands, getAiCommands } from './commandService';

// Helper para encontrar comandos por ID
const findById = (commands: Command[], id: string): Command | undefined =>
  commands.find((c) => c.id === id);

// --- Type assertions para habilitar .set en mocks ---
const mockCommandBarStore = commandBarStore as typeof commandBarStore & {
  set: (v: any) => void;
};
const mockReviewStore = reviewStore as typeof reviewStore & {
  set: (v: any) => void;
};
const mockTtsStore = ttsStore as typeof ttsStore & { set: (v: any) => void };
const mockEditorStore = editorStore as typeof editorStore & {
  set: (v: any) => void;
};

describe('commandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCommandBarStore.set({ currentParentId: null });
    mockEditorStore.set({ ...get(editorStore), selectedNodePos: 10 });
    mockReviewStore.set({ isReviewing: false });
    mockTtsStore.set({ status: 'idle' });
  });

  describe('getCommands (Main Menu)', () => {
    it('"new-schema" command calls documentStore with parentId and closes bar', () => {
      mockCommandBarStore.set({ currentParentId: 'folder-123' });
      const command = findById(getCommands(), 'new-schema');
      command?.action();

      expect(vi.mocked(documentStore.createNewDocument)).toHaveBeenCalledWith(
        'default schema name',
        undefined,
        'folder-123'
      );
      expect(vi.mocked(commandBarStore.close)).toHaveBeenCalled();
    });

    it('"switch-schema" command should set the view to "list-schemas"', () => {
      const command = findById(getCommands(), 'switch-schema');
      command?.action();
      expect(vi.mocked(commandBarStore.setView)).toHaveBeenCalledWith(
        'list-schemas'
      );
    });

    it('"start-review" command is DISABLED when reviewing', () => {
      mockReviewStore.set({ isReviewing: true });
      const command = findById(getCommands(), 'start-review');
      expect(command?.isEnabled?.()).toBe(false);
    });

    it('"read-aloud" command is DISABLED when TTS is playing', () => {
      mockTtsStore.set({ status: 'playing' });
      const command = findById(getCommands(), 'read-aloud');
      expect(command?.isEnabled?.()).toBe(false);
    });
  });

  describe('getAiCommands (AI Menu)', () => {
    it('node-specific commands are DISABLED if NO node is selected', () => {
      mockEditorStore.set({ ...get(editorStore), selectedNodePos: null });
      const generate = findById(getAiCommands(), 'generate-flashcards');
      const expand = findById(getAiCommands(), 'expand-node');
      expect(generate?.isEnabled?.()).toBe(false);
      expect(expand?.isEnabled?.()).toBe(false);
    });

    it('node-specific commands are ENABLED when a node is selected', () => {
      mockEditorStore.set({ ...get(editorStore), selectedNodePos: 42 });
      const generate = findById(getAiCommands(), 'generate-flashcards');
      const expand = findById(getAiCommands(), 'expand-node');
      expect(generate?.isEnabled?.()).toBe(true);
      expect(expand?.isEnabled?.()).toBe(true);
    });
  });
});
