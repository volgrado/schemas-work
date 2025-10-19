/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  modalStore,
  type FormulaModalConfig,
  type MediaModalConfig,
} from './modalStore';

// Create mock data that matches the new ModalConfig types
const mockFormulaConfig: FormulaModalConfig = {
  type: 'formula',
  nodePos: 42,
  attrs: {
    formula: 'E = mc^2',
  },
};

const mockMediaConfig: MediaModalConfig = {
  type: 'media',
  nodeType: 'image',
  nodePos: 10,
  attrs: {
    src: 'https://example.com/image.png',
  },
};

describe('modalStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test using its own API
    modalStore.close();
  });

  it('should have a correct initial state', () => {
    const state = get(modalStore);
    expect(state.isOpen).toBe(false);
    expect(state.config).toBeNull();
  });

  describe('open', () => {
    it('should set isOpen to true and store the formula config', () => {
      modalStore.open(mockFormulaConfig);
      const state = get(modalStore);

      expect(state.isOpen).toBe(true);
      expect(state.config).toEqual(mockFormulaConfig);
    });

    it('should set isOpen to true and store the media config', () => {
      modalStore.open(mockMediaConfig);
      const state = get(modalStore);

      expect(state.isOpen).toBe(true);
      expect(state.config).toEqual(mockMediaConfig);
    });

    it('should overwrite a previous config when opening a new modal', () => {
      // First, open a formula modal
      modalStore.open(mockFormulaConfig);
      expect(get(modalStore).config?.type).toBe('formula');

      // Then, open a media modal
      modalStore.open(mockMediaConfig);
      const state = get(modalStore);
      expect(state.isOpen).toBe(true);
      expect(state.config).toEqual(mockMediaConfig); // The config should now be the media one
    });
  });

  describe('close', () => {
    it('should set isOpen to false and reset the config to null', () => {
      // First, open a modal to establish a non-initial state
      modalStore.open(mockFormulaConfig);
      expect(get(modalStore).isOpen).toBe(true); // Pre-condition check

      // Now, close it
      modalStore.close();
      const state = get(modalStore);

      // Assert that the state has been fully reset
      expect(state.isOpen).toBe(false);
      expect(state.config).toBeNull();
    });

    it('should not cause an error if called when already closed', () => {
      // The store is already closed initially
      expect(() => modalStore.close()).not.toThrow();
    });
  });
});
