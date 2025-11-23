/**
 * @file Manages keyboard shortcuts and maps them to actions.
 * @module keybindingManager
 */
import { onMount, onDestroy } from 'svelte';
import { actionRegistry } from './registry';

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

    // Prioritize actions based on context?
    // For now, just execute the first enabled one.
    // In a real app, we'd check if the context matches (e.g. is editor focused).
    
    for (const action of actions) {
      // TODO: Add context checking logic here.
      // For now, we rely on the action's handler or isEnabled check.
      
      // Prevent default if action is executed
      // We might want to check if the action actually did something.
      
      // Simple heuristic: if it's an editor command and we are in the editor, execute.
      // If it's a global command, execute.
      
      actionRegistry.execute(action.id);
      event.preventDefault();
      event.stopPropagation();
      return;
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
