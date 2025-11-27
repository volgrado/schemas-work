/**
 * @file Manages keyboard shortcuts and maps them to actions.
 * @module keybindingManager
 */
import { onMount, onDestroy } from 'svelte';
import { actionRegistry } from './registry';
import { uiState } from '$lib/stores/uiStore.svelte';

type KeyHandler = (event: KeyboardEvent) => void;

class KeybindingManager {
  private isMac = typeof navigator !== 'undefined' ? /Mac|iPod|iPhone|iPad/.test(navigator.platform) : false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
    }
  }

  private handleKeydown = (event: KeyboardEvent) => {
    // Ignore if inside an input/textarea/contenteditable unless it's a special command?
    // For now, we want global commands to work, but maybe not if typing text.
    // But editor commands SHOULD work when typing.
    
    // We need to parse the event to a string like "Mod+B"
    const keyString = this.eventToKeyString(event);
    if (!keyString) return;

    // Find actions with this shortcut
    const actions = actionRegistry.getAll().filter(a => 
      a.shortcuts?.some(s => this.normalizeShortcut(s) === keyString)
    );

    if (actions.length === 0) return;

    // Determine current context
    let currentContext = 'global';
    if (uiState.commandBar.isOpen) {
      currentContext = 'view:command-bar';
    } else if (uiState.activeView === 'editor') {
      currentContext = 'editor';
    } else if (uiState.activeView === 'tree') {
      currentContext = 'tree';
    }

    // Filter actions by context
    // We prioritize specific context matches over global ones if both exist?
    // Or we just execute the one that matches the current context.
    const validActions = actions.filter(a => 
      a.context === 'global' || a.context === currentContext
    );

    if (validActions.length === 0) return;

    // If we have multiple matches (e.g. global and specific), which one wins?
    // Usually specific wins.
    validActions.sort((a, b) => {
      if (a.context === currentContext && b.context === 'global') return -1;
      if (a.context === 'global' && b.context === currentContext) return 1;
      return 0;
    });

    const actionToExecute = validActions[0];

    if (actionToExecute) {
      // Check if enabled
      if (actionToExecute.isEnabled && !actionToExecute.isEnabled()) {
        return;
      }
      
      actionRegistry.execute(actionToExecute.id);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private eventToKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.metaKey && this.isMac) parts.push('Mod');
    if (event.ctrlKey && !this.isMac) parts.push('Mod');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    
    // Handle special keys
    const key = event.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return ''; // Just a modifier
    
    parts.push(key);
    return parts.join('+');
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.toUpperCase();
  }
}

// Singleton instance
export const keybindingManager = new KeybindingManager();

// Svelte action or component to enable keybindings?
// Since it's global, we can just import it in the root layout or use a useKeybindings action.
