/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { commandBarStore } from './commandBarStore';

describe('commandBarStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    commandBarStore.close();
  });

  it('should have a correct initial state', () => {
    const state = get(commandBarStore);
    expect(state.isOpen).toBe(false);
    expect(state.currentView).toBe('main');
    expect(state.isPasswordModalOpen).toBe(false);
    expect(state.passwordModalAction).toBe('export'); // Default
    expect(state.isAiHelperOpen).toBe(false);
    expect(state.aiHelperAction).toBeNull();
    expect(state.isDiagnosticModalOpen).toBe(false);
    expect(state.currentParentId).toBeNull();
  });

  describe('Main Bar Management (open, close, toggle)', () => {
    it('open() should set isOpen to true and reset other state', () => {
      // Set some non-default state first
      commandBarStore.openPasswordModal('import');
      commandBarStore.setView('list-schemas');

      // Now open the main bar
      commandBarStore.open();

      const state = get(commandBarStore);
      expect(state.isOpen).toBe(true);
      // Should reset other modals and views
      expect(state.isPasswordModalOpen).toBe(false);
      expect(state.currentView).toBe('main');
    });

    it('close() should set all flags to false and reset state', () => {
      commandBarStore.open();
      commandBarStore.setView('ai-actions');
      expect(get(commandBarStore).isOpen).toBe(true); // Pre-condition

      commandBarStore.close();
      const state = get(commandBarStore);
      expect(state.isOpen).toBe(false);
      expect(state.currentView).toBe('main');
    });

    it('toggle() should open the bar if it is closed', () => {
      expect(get(commandBarStore).isOpen).toBe(false); // Initial state
      commandBarStore.toggle();
      expect(get(commandBarStore).isOpen).toBe(true);
    });

    it('toggle() should close the bar if it is open', () => {
      commandBarStore.open();
      expect(get(commandBarStore).isOpen).toBe(true); // Pre-condition
      commandBarStore.toggle();
      expect(get(commandBarStore).isOpen).toBe(false);
    });
  });

  describe('View and Context Management', () => {
    it('setView() should change the current view', () => {
      commandBarStore.setView('list-schemas');
      expect(get(commandBarStore).currentView).toBe('list-schemas');
    });

    it('setCurrentParentId() should set the parent ID', () => {
      const testId = 'folder-123';
      commandBarStore.setCurrentParentId(testId);
      expect(get(commandBarStore).currentParentId).toBe(testId);
    });
  });

  describe('Modal Orchestration', () => {
    it('openPasswordModal() should open the password modal and close the main bar', () => {
      commandBarStore.open(); // Start with main bar open
      commandBarStore.openPasswordModal('import');

      const state = get(commandBarStore);
      expect(state.isOpen).toBe(false); // Main bar should be closed
      expect(state.isPasswordModalOpen).toBe(true);
      expect(state.passwordModalAction).toBe('import');
    });

    it('closePasswordModal() should only close the password modal', () => {
      commandBarStore.openPasswordModal('export');
      expect(get(commandBarStore).isPasswordModalOpen).toBe(true); // Pre-condition

      commandBarStore.closePasswordModal();
      expect(get(commandBarStore).isPasswordModalOpen).toBe(false);
    });

    it('openAiHelper() should open the AI modal and close the main bar', () => {
      commandBarStore.open();
      commandBarStore.openAiHelper('generate-flashcards');

      const state = get(commandBarStore);
      expect(state.isOpen).toBe(false); // Main bar should be closed
      expect(state.isAiHelperOpen).toBe(true);
      expect(state.aiHelperAction).toBe('generate-flashcards');
    });

    it('closeAiHelper() should close the AI modal and reset its action', () => {
      commandBarStore.openAiHelper('expand-node');
      expect(get(commandBarStore).isAiHelperOpen).toBe(true); // Pre-condition

      commandBarStore.closeAiHelper();
      const state = get(commandBarStore);
      expect(state.isAiHelperOpen).toBe(false);
      expect(state.aiHelperAction).toBeNull();
    });

    it('openDiagnosticModal() should open the diagnostic modal and close the main bar', () => {
      commandBarStore.open();
      commandBarStore.openDiagnosticModal();

      const state = get(commandBarStore);
      expect(state.isOpen).toBe(false); // Main bar should be closed
      expect(state.isDiagnosticModalOpen).toBe(true);
    });

    it('closeDiagnosticModal() should only close the diagnostic modal', () => {
      commandBarStore.openDiagnosticModal();
      expect(get(commandBarStore).isDiagnosticModalOpen).toBe(true); // Pre-condition

      commandBarStore.closeDiagnosticModal();
      expect(get(commandBarStore).isDiagnosticModalOpen).toBe(false);
    });
  });
});
