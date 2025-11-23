/**
 * @file Central registry for all application actions.
 * @module actionRegistry
 */
import type { IconName } from '$lib/types/iconName';

export type ActionContextType = 'global' | 'editor' | 'tree' | 'view:command-bar';

export interface ActionContext {
  // Add specific context properties here as needed
  editor?: any; // Type as Editor if possible, or keep generic for now
  [key: string]: any;
}

export interface Action {
  id: string;
  title: string;
  description?: string;
  group?: string;
  icon?: IconName;
  shortcuts?: string[]; // e.g., ['Mod+B', 'Ctrl+B']
  context: ActionContextType;
  /**
   * The function to execute when the action is triggered.
   * Returns true if the action was successfully executed.
   */
  handler: (context?: ActionContext) => void | Promise<void> | boolean;
  /**
   * Optional condition to check if the action is currently enabled/visible.
   */
  isEnabled?: (context?: ActionContext) => boolean;
}

class ActionRegistry {
  private actions = new Map<string, Action>();
  private listeners = new Set<() => void>();

  register(action: Action) {
    if (this.actions.has(action.id)) {
      console.warn(`Action with ID "${action.id}" is already registered. Overwriting.`);
    }
    this.actions.set(action.id, action);
    this.notify();
  }

  unregister(actionId: string) {
    if (this.actions.delete(actionId)) {
      this.notify();
    }
  }

  get(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  getAll(): Action[] {
    return Array.from(this.actions.values());
  }

  getActionsByContext(context: ActionContextType): Action[] {
    return this.getAll().filter(a => a.context === context || a.context === 'global');
  }

  execute(actionId: string, context?: ActionContext) {
    const action = this.get(actionId);
    if (action) {
      if (action.isEnabled && !action.isEnabled(context)) {
        return;
      }
      try {
        action.handler(context);
      } catch (error) {
        console.error(`Error executing action "${actionId}":`, error);
      }
    } else {
      console.warn(`Action "${actionId}" not found.`);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const actionRegistry = new ActionRegistry();
