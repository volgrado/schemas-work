/**
 * @file fileSystemStore.svelte.ts
 * @store
 * @description
 * This store manages the entire file system state of the application using Svelte 5 Runes.
 * It provides a comprehensive API for CRUD operations on files and folders, maintains
 * synchronization with local storage, and offers an event-based subscription system
 * to react to file system changes (like creation, deletion, or updates) across the app.
 */
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter } from '../infra/localStorageAdapter';
import type { FileSystemNode, FileSystemEvent } from '../domain/types';
import { generateUniqueName } from '$lib/core/utils/nameUtils';

class FileSystemStore {
  // The core state, reactive using Svelte 5 runes.
  items = $state<FileSystemNode[]>([]);
  isInitialized = $state(false);

  // A simple, internal event emitter pattern for notifying subscribers of changes.
  private listeners: ((event: FileSystemEvent) => void)[] = [];

  constructor() {
    // Ensure we only initialize in the browser environment.
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * internal initialization logic.
   * Loads initial data from LocalStorage and sets up cross-tab synchronization.
   */
  private init() {
    this.items = LocalStorageAdapter.getAll();
    this.isInitialized = true;

    // Listen for storage events to sync changes from other tabs/windows.
    window.addEventListener('storage', (e) => {
      // TODO: Move 'directory_storage_key' to a shared constant in $lib/constants.ts
      if (e.key === 'directory_storage_key') {
        this.items = LocalStorageAdapter.getAll();
        this.notifyListeners({ type: 'reloaded', items: this.items });
      }
    });
  }

  // --- Read Operations ---

  /**
   * Retrieves all nodes in the file system.
   * @returns {FileSystemNode[]} An array of all file and folder nodes.
   */
  getAll(): FileSystemNode[] {
    return this.items;
  }

  /**
   * Retrieves the immediate children of a given parent folder.
   * @param parentId - The ID of the parent folder, or null for root.
   * @returns {FileSystemNode[]} An array of child nodes.
   */
  getChildren(parentId: string | null): FileSystemNode[] {
    return this.items.filter((item) => item.parentId === parentId);
  }

  /**
   * Finds a specific node by its unique ID.
   * @param id - The ID of the node to find.
   * @returns {FileSystemNode | undefined} The node if found, otherwise undefined.
   */
  getItem(id: string): FileSystemNode | undefined {
    return this.items.find((item) => item.id === id);
  }

  /**
   * Recursively finds all descendant nodes (children, grandchildren, etc.) of a given node.
   * @param id - The ID of the ancestor node.
   * @returns {FileSystemNode[]} A flat array of all descendant nodes.
   */
  getDescendants(id: string): FileSystemNode[] {
    const descendants: FileSystemNode[] = [];
    const collectChildren = (pid: string) => {
      this.items
        .filter((i) => i.parentId === pid)
        .forEach((child) => {
          descendants.push(child);
          // If the child is a folder, recursively collect its children.
          if (child.type === 'folder') collectChildren(child.id);
        });
    };
    collectChildren(id);
    return descendants;
  }

  /**
   * Retrieves the ID of the last active document from local storage.
   * @returns {string | null} The ID of the last opened document, or null if none.
   */
  getLastActiveDocId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('lastActiveDocId');
  }

  // --- Write Operations ---

  /**
   * Creates a new document (schema) node.
   * Automatically handles name uniqueness within the parent folder.
   *
   * @param title - The desired title for the new document.
   * @param parentId - The ID of the parent folder (optional).
   * @returns {Promise<FileSystemNode>} The newly created node.
   */
  async createSchema(
    title: string,
    parentId: string | null = null
  ): Promise<FileSystemNode> {
    const uniqueTitle = generateUniqueName(title, parentId, this.items);
    const newItem: FileSystemNode = {
      id: uuidv4(),
      title: uniqueTitle,
      type: 'schema',
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.items.push(newItem);
    this.persist();
    this.notifyListeners({ type: 'created', item: newItem });
    return newItem;
  }

  /**
   * Creates a new folder node.
   * Automatically handles name uniqueness within the parent folder.
   *
   * @param title - The desired title for the new folder.
   * @param parentId - The ID of the parent folder (optional).
   * @returns {Promise<FileSystemNode>} The newly created node.
   */
  async createFolder(
    title: string,
    parentId: string | null = null
  ): Promise<FileSystemNode> {
    const uniqueTitle = generateUniqueName(title, parentId, this.items);
    const newItem: FileSystemNode = {
      id: uuidv4(),
      title: uniqueTitle,
      type: 'folder',
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.items.push(newItem);
    this.persist();
    this.notifyListeners({ type: 'created', item: newItem });
    return newItem;
  }

  /**
   * Updates an existing node's properties.
   * Automatically handles renaming conflicts if the title is updated.
   *
   * @param id - The ID of the node to update.
   * @param updates - A partial object containing the properties to update.
   * @returns {Promise<FileSystemNode>} The updated node.
   * @throws {Error} If the node with the given ID is not found.
   */
  async updateItem(id: string, updates: Partial<Omit<FileSystemNode, 'id'>>) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Item not found');

    const original = this.items[index];

    // If the title is changing, ensure the new name is unique in its directory.
    if (updates.title && updates.title !== original.title) {
      const others = this.items.filter((i) => i.id !== id);
      updates.title = generateUniqueName(
        updates.title,
        original.parentId,
        others
      );
    }

    const updated = { ...original, ...updates, updatedAt: Date.now() };
    this.items[index] = updated;

    this.persist();
    this.notifyListeners({ type: 'updated', item: updated });
    return updated;
  }

  /**
   * Deletes a node and all its descendants from the file system.
   *
   * @param id - The ID of the node to delete.
   * @returns {Promise<void>}
   */
  async deleteItem(id: string) {
    // Identify all descendants to ensure complete cleanup.
    const descendants = this.getDescendants(id);
    const toDelete = new Set<string>([id, ...descendants.map((d) => d.id)]);

    // Filter out the deleted nodes from the state.
    this.items = this.items.filter((i) => !toDelete.has(i.id));
    this.persist();
    this.notifyListeners({ type: 'deleted', item: { id } as any });
  }

  /**
   * Moves a node to a new parent folder.
   * Includes cycle detection to prevent moving a folder into itself or its descendants.
   *
   * @param id - The ID of the node to move.
   * @param newParentId - The ID of the new parent folder, or null for root.
   * @returns {Promise<void>}
   * @throws {Error} If the node is not found or if a cycle is detected.
   */
  async moveItem(id: string, newParentId: string | null) {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new Error('Item not found');
    if (item.parentId === newParentId) return;

    // Cycle detection: ensure we aren't moving a folder into one of its own subfolders.
    if (item.type === 'folder') {
      let curr = newParentId;
      while (curr) {
        if (curr === id) throw new Error('Cannot move folder into itself');
        curr = this.items.find((i) => i.id === curr)?.parentId ?? null;
      }
    }

    item.parentId = newParentId;
    item.updatedAt = Date.now();
    this.persist();
    this.notifyListeners({ type: 'updated', item });
  }

  /**
   * Persists the ID of the currently active document.
   * Used to restore the user's session on reload.
   * @param id - The ID of the active document.
   */
  async setLastActiveDocId(id: string) {
    localStorage.setItem('lastActiveDocId', id);
  }

  /**
   * WIPES the entire file system. Use with caution.
   * This is typically used during a full data restore (import).
   */
  async clear() {
    this.items = [];
    LocalStorageAdapter.clear();
    this.notifyListeners({ type: 'deleted', item: { id: 'all' } as any });
  }

  /**
   * Restores the file system state from a backup.
   * @param items - The array of nodes to restore.
   */
  async restore(items: FileSystemNode[]) {
    this.items = items;
    this.persist();
    this.notifyListeners({ type: 'reloaded', items: this.items });
  }

  // --- Subscriptions ---

  /**
   * Subscribes a callback function to file system events.
   * @param listener - The callback function.
   * @returns {() => void} A function to unsubscribe.
   */
  subscribe(listener: (event: FileSystemEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Internal helper to notify all listeners of an event.
   */
  private notifyListeners(event: FileSystemEvent) {
    this.listeners.forEach((l) => l(event));
  }

  /**
   * Internal helper to save the current state to LocalStorage.
   */
  private persist() {
    LocalStorageAdapter.save(this.items);
  }
}

export const fileSystemStore = new FileSystemStore();
