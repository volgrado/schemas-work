// src/lib/stores/slashMenuStore.ts
/**
 * @file Manages the state and interactions for the editor's slash command menu using Svelte 5 Runes.
 * @module slashMenuStore
 *
 * @remarks
 * This module exports a reactive `$state` object (`slashMenuState`) for the ephemeral UI state
 * of the slash command menu. It provides a set of standalone functions for opening the menu,
 * handling navigation, and executing commands via a callback, maintaining a clean separation of concerns
 * between the Tiptap extension (logic), this store (state), and the Svelte component (view).
 */

import type { CommandItem } from '$lib/editor/slashCommands';

// --- Type and State Definitions ---

export interface SlashMenuState {
  isOpen: boolean;
  allItems: CommandItem[];
  filteredItems: CommandItem[];
  groups: string[];
  activeGroupIndex: number;
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  commandToExecute: ((item: CommandItem) => void) | null;
  query: string;
}

const initialState: SlashMenuState = {
  isOpen: false,
  allItems: [],
  filteredItems: [],
  groups: [],
  activeGroupIndex: 0,
  selectedIndex: 0,
  clientRect: null,
  commandToExecute: null,
  query: '',
};

// REFINEMENT (RUNES): Export the reactive state object directly.
export const slashMenuState = $state<SlashMenuState>({ ...initialState });

// --- Private Helper Function ---

/**
 * Filters the items based on the currently active group and resets the selection index.
 * This function directly mutates the `slashMenuState`.
 * @internal
 */
function filterItemsByActiveGroup(): void {
  const activeGroup = slashMenuState.groups[slashMenuState.activeGroupIndex];
  slashMenuState.filteredItems = slashMenuState.allItems.filter(
    (item) => item.group === activeGroup
  );
  slashMenuState.selectedIndex = 0;
}

// --- Public Action Functions ---

/** Opens the slash command menu with the provided context from the Tiptap extension. */
export function open(
  items: CommandItem[],
  clientRect: (() => DOMRect | null) | null,
  command: (item: CommandItem) => void,
  query: string
): void {
  // REFINEMENT (RUNES): Directly mutate the state object.
  Object.assign(slashMenuState, initialState); // Ensure a clean state before opening
  slashMenuState.isOpen = true;
  slashMenuState.allItems = items;
  slashMenuState.groups = [...new Set(items.map((item) => item.group))];
  slashMenuState.clientRect = clientRect;
  slashMenuState.commandToExecute = command;
  slashMenuState.query = query;
  filterItemsByActiveGroup();
}

/** Closes the menu and resets its state completely. */
export function close(): void {
  Object.assign(slashMenuState, initialState);
}

/** Updates the list of items and groups based on the user's changing query. */
export function updateItems(newItems: CommandItem[], query: string): void {
  slashMenuState.allItems = newItems;
  slashMenuState.query = query;
  slashMenuState.groups = [...new Set(newItems.map((item) => item.group))];
  // Prevent index out of bounds if the active group disappears
  if (slashMenuState.activeGroupIndex >= slashMenuState.groups.length) {
    slashMenuState.activeGroupIndex = 0;
  }
  filterItemsByActiveGroup();
}

/** Moves the selection highlight up or down within the filtered list. */
export function moveSelection(direction: 1 | -1): void {
  if (slashMenuState.filteredItems.length === 0) return;
  const newIndex =
    (slashMenuState.selectedIndex +
      slashMenuState.filteredItems.length +
      direction) %
    slashMenuState.filteredItems.length;
  slashMenuState.selectedIndex = newIndex;
}

/** Switches to the next or previous group of commands. */
export function moveGroup(direction: 1 | -1): void {
  if (slashMenuState.groups.length <= 1) return;
  const newIndex =
    (slashMenuState.activeGroupIndex +
      slashMenuState.groups.length +
      direction) %
    slashMenuState.groups.length;
  slashMenuState.activeGroupIndex = newIndex;
  filterItemsByActiveGroup();
}

/** Sets the active group by its index, typically via a mouse click. */
export function setActiveGroup(index: number): void {
  if (
    index === slashMenuState.activeGroupIndex ||
    index >= slashMenuState.groups.length
  ) {
    return;
  }
  slashMenuState.activeGroupIndex = index;
  filterItemsByActiveGroup();
}

/** Executes the currently selected command and closes the menu. */
export function triggerCommand(): void {
  const item = slashMenuState.filteredItems[slashMenuState.selectedIndex];
  if (item && slashMenuState.commandToExecute) {
    slashMenuState.commandToExecute(item);
  }
  close(); // Reset state after execution
}

/** Executes a specific command by its index and closes the menu, typically from a mouse click. */
export function triggerCommandByIndex(index: number): void {
  const item = slashMenuState.filteredItems[index];
  if (item && slashMenuState.commandToExecute) {
    slashMenuState.commandToExecute(item);
  }
  close(); // Reset state after execution
}
