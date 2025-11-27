/**
 * @file registry.ts
 * @module actions
 * @description
 * A centralized, robust registry for defining, retrieving, and executing application actions.
 *
 * This implementation follows the Command Pattern, decoupling the invoker (UI buttons,
 * shortcuts, Command Bar) from the receiver (business logic). It supports context-aware
 * actions, dynamic enabling/disabling, and a subscription mechanism for reactive UI updates.
 */

import type { IconName } from '$lib/core/domain/iconName';

/**
 * Defines the scopes where an action is valid.
 * - `global`: Available everywhere.
 * - `editor`: Only available when the text editor is active.
 * - `tree`: Only available when the tree visualization is active.
 * - `view:command-bar`: Actions specifically displayed in the Command Bar's main view.
 */
export type ActionContextType =
  | 'global'
  | 'editor'
  | 'tree'
  | 'view:command-bar';

/**
 * A flexible interface for passing runtime context to action handlers.
 */
export interface ActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor?: any; // Ideally typed as Tiptap Editor, but kept loose for decoupling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * The definition of a single executable action in the system.
 */
export interface Action<T = ActionContext> {
  /** Unique identifier for the action (e.g., 'editor.save'). */
  id: string;
  /** Human-readable title for UI display. */
  title: string;
  /** Optional description or tooltip text. */
  description?: string;
  /** Category for grouping actions in menus (e.g., 'File', 'Edit'). */
  group?: string;
  /** Icon to display associated with the action. */
  icon?: IconName;
  /** Keyboard shortcuts (e.g., ['Mod+S']). Currently for display/documentation. */
  shortcuts?: string[];
  /** The scope where this action applies. */
  context: ActionContextType;

  /**
   * The implementation of the action.
   * @param context - Optional context data passed at execution time.
   */
  handler: (context?: T) => void | Promise<void> | boolean;

  /**
   * Predicate to determine if the action is currently executable.
   * Used for disabling buttons or hiding menu items.
   * @param context - Optional context data.
   */
  isEnabled?: (context?: T) => boolean;
}

/**
 * Singleton registry class managing the lifecycle of actions.
 */
class ActionRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private actions = new Map<string, Action<any>>();
  private listeners = new Set<() => void>();

  /**
   * Registers a new action. Overwrites any existing action with the same ID.
   * Triggers a notification to all subscribers.
   * @param action - The action definition to register.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(action: Action<any>) {
    if (this.actions.has(action.id)) {
      console.warn(
        `[ActionRegistry] Overwriting existing action: "${action.id}"`
      );
    }
    this.actions.set(action.id, action);
    this.notify();
  }

  /**
   * Removes an action from the registry.
   * @param actionId - The ID of the action to remove.
   */
  unregister(actionId: string) {
    if (this.actions.delete(actionId)) {
      this.notify();
    }
  }

  /**
   * Retrieves an action by its ID.
   * @param actionId - The ID to look up.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(actionId: string): Action<any> | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Returns all registered actions.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll(): Action<any>[] {
    return Array.from(this.actions.values());
  }

  /**
   * Retrieves all actions belonging to a specific context (plus global actions).
   * @param context - The target context type.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActionsByContext(context: ActionContextType): Action<any>[] {
    return this.getAll().filter(
      (a) => a.context === context || a.context === 'global'
    );
  }

  /**
   * Executes an action by ID.
   * Checks the `isEnabled` predicate before execution.
   * @param actionId - The ID of the action to execute.
   * @param context - Optional context to pass to the handler.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(actionId: string, context?: any) {
    const action = this.get(actionId);
    if (action) {
      if (action.isEnabled && !action.isEnabled(context)) {
        console.log(
          `[ActionRegistry] Action "${actionId}" is currently disabled.`
        );
        return;
      }
      try {
        action.handler(context);
      } catch (error) {
        console.error(`[ActionRegistry] Error executing "${actionId}":`, error);
      }
    } else {
      console.warn(`[ActionRegistry] Action "${actionId}" not found.`);
    }
  }

  /**
   * Subscribes to changes in the registry (registrations/unregistrations).
   * Useful for reactive UI components that render lists of actions.
   * @param listener - Callback function.
   * @returns Unsubscribe function.
   */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

/**
 * Global singleton instance of the ActionRegistry.
 */
export const actionRegistry = new ActionRegistry();
