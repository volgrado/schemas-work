import { describe, it, expect, vi } from 'vitest';
import { getCommands, getAiCommands } from './commandService';
import { editorStore, isNodeSelected } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';

vi.mock('$lib/stores/editorStore', () => ({
  editorStore: { subscribe: vi.fn() },
  isNodeSelected: { subscribe: vi.fn() },
}));

vi.mock('$lib/stores/reviewStore', () => ({
  reviewStore: { subscribe: vi.fn(), startReview: vi.fn() },
}));

vi.mock('$lib/stores/ttsStore', () => ({
  ttsStore: { subscribe: vi.fn(), startReading: vi.fn() },
}));

vi.mock('$lib/stores/commandBarStore', () => ({
  commandBarStore: {
    close: vi.fn(),
    setView: vi.fn(),
    openPasswordModal: vi.fn(),
    openDiagnosticModal: vi.fn(),
    openAiHelper: vi.fn(),
  },
}));

vi.mock('$lib/stores/documentStore', () => ({
  documentStore: { createNewDocument: vi.fn() },
}));

describe('commandService', () => {
  it('should return the correct main commands', () => {
    const commands = getCommands();
    expect(commands).toHaveLength(8);
    expect(commands[0].id).toBe('new-schema');
    expect(commands[1].id).toBe('switch-schema');
    expect(commands[2].id).toBe('ai-submenu');
    expect(commands[3].id).toBe('start-review');
    expect(commands[4].id).toBe('read-aloud');
    expect(commands[5].id).toBe('export-vault');
    expect(commands[6].id).toBe('import-vault');
    expect(commands[7].id).toBe('report-problem');
  });

  it('should return the correct AI commands', () => {
    const commands = getAiCommands();
    expect(commands).toHaveLength(3);
    expect(commands[0].id).toBe('create-schema-from-text');
    expect(commands[1].id).toBe('generate-flashcards');
    expect(commands[2].id).toBe('expand-node');
  });
});