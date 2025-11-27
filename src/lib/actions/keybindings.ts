/**
 * @file keybindings.ts
 * @module actions
 * @description
 * Global manager for keyboard shortcuts.
 * It listens to window-level `keydown` events, parses them into a standardized format
 * (e.g., "Mod+Shift+K"), and resolves them against the `ActionRegistry`.
 * It handles context-sensitive dispatching (Global vs. Editor vs. Command Bar).
 */

import { actionRegistry, type ActionContextType } from './registry';
import { uiState } from '$lib/stores/uiStore.svelte';

class KeybindingManager {
  private isMac = typeof navigator !== 'undefined' ? /Mac|iPod|iPhone|iPad/.test(navigator.platform) : false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
    }
  }

  /**
   * Cleans up event listeners.
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
    }
  }

  private handleKeydown = (event: KeyboardEvent) => {
    // 1. Parse the event into a recognizable string key (e.g., "Mod+S")
    const keyString = this.eventToKeyString(event);
    if (!keyString) return;

    // 2. Find all actions registered with this shortcut
    const actions = actionRegistry.getAll().filter(a => 
      a.shortcuts?.some(s => this.normalizeShortcut(s) === keyString)
    );

    if (actions.length === 0) return;

    // 3. Determine the current application context
    let currentContext: ActionContextType = 'global';
    if (uiState.commandBar.isOpen) {
      currentContext = 'view:command-bar';
    } else if (uiState.activeView === 'editor') {
      currentContext = 'editor';
    } else if (uiState.activeView === 'tree') {
      currentContext = 'tree';
    }

    // 4. Filter actions: Only allow Global actions or actions matching current context
    const validActions = actions.filter(a => 
      a.context === 'global' || a.context === currentContext
    );

    if (validActions.length === 0) return;

    // 5. Prioritize specific context over global context
    validActions.sort((a, b) => {
      if (a.context === currentContext && b.context === 'global') return -1;
      if (a.context === 'global' && b.context === currentContext) return 1;
      return 0;
    });

    const actionToExecute = validActions[0];

    // 6. Execute if enabled
    if (actionToExecute) {
      // Respect 'isEnabled' guard
      if (actionToExecute.isEnabled && !actionToExecute.isEnabled()) {
        return;
      }
      
      // Execute via Registry
      actionRegistry.execute(actionToExecute.id);

      // Prevent default browser behavior (e.g. Ctrl+S saving webpage)
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /**
   * Converts a DOM KeyboardEvent into a standardized string representation.
   * Handles platform differences (Mac 'Meta' vs Windows 'Ctrl').
   */
  private eventToKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.metaKey && this.isMac) parts.push('Mod');
    if (event.ctrlKey && !this.isMac) parts.push('Mod');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    
    // Ignore modifier-only events
    const key = event.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return '';
    
    parts.push(key);
    return parts.join('+');
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.toUpperCase();
  }
}

/**
 * Singleton instance of the KeybindingManager.
 * Initialized once at the module level to ensure global capture.
 */
export const keybindingManager = new KeybindingManager();
