import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter } from '../infra/localStorageAdapter';
import type { FileSystemNode, FileSystemEvent } from '../domain/FileSystemNode';
import { generateUniqueName } from '$lib/core/utils/nameUtils';

class FileSystemStore {
  items = $state<FileSystemNode[]>([]);
  isInitialized = $state(false);

  // Simple event system for stores to subscribe to
  private listeners: ((event: FileSystemEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    this.items = LocalStorageAdapter.getAll();
    this.isInitialized = true;

    // Sync with other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'directory_storage_key') { // Use constant in real code
        this.items = LocalStorageAdapter.getAll();
        this.notifyListeners({ type: 'reloaded', items: this.items });
      }
    });
  }

  getAll() {
    return this.items;
  }

  getChildren(parentId: string | null) {
    return this.items.filter((item) => item.parentId === parentId);
  }

  getItem(id: string) {
    return this.items.find((item) => item.id === id);
  }

  async createSchema(title: string, parentId: string | null = null): Promise<FileSystemNode> {
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

  async createFolder(title: string, parentId: string | null = null): Promise<FileSystemNode> {
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

  async updateItem(id: string, updates: Partial<Omit<FileSystemNode, 'id'>>) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Item not found');

    const original = this.items[index];
    
    // Auto-rename if title changes
    if (updates.title) {
       const others = this.items.filter(i => i.id !== id);
       updates.title = generateUniqueName(updates.title, original.parentId, others);
    }

    const updated = { ...original, ...updates, updatedAt: Date.now() };
    this.items[index] = updated;
    
    this.persist();
    this.notifyListeners({ type: 'updated', item: updated });
    return updated;
  }

  getDescendants(id: string): FileSystemNode[] {
    const descendants: FileSystemNode[] = [];
    const collectChildren = (pid: string) => {
      this.items.filter(i => i.parentId === pid).forEach(child => {
        descendants.push(child);
        if (child.type === 'folder') collectChildren(child.id);
      });
    };
    collectChildren(id);
    return descendants;
  }

  async deleteItem(id: string) {
    const descendants = this.getDescendants(id);
    const toDelete = new Set<string>([id, ...descendants.map(d => d.id)]);

    this.items = this.items.filter(i => !toDelete.has(i.id));
    this.persist();
    this.notifyListeners({ type: 'deleted', item: { id } as any });
  }

  async moveItem(id: string, newParentId: string | null) {
    const item = this.items.find(i => i.id === id);
    if (!item) throw new Error('Item not found');
    if (item.parentId === newParentId) return;

    // Cycle detection
    if (item.type === 'folder') {
      let curr = newParentId;
      while (curr) {
        if (curr === id) throw new Error('Cannot move folder into itself');
        curr = this.items.find(i => i.id === curr)?.parentId ?? null;
      }
    }

    item.parentId = newParentId;
    item.updatedAt = Date.now();
    this.persist();
    this.notifyListeners({ type: 'updated', item });
  }

  async setLastActiveDocId(id: string) {
    localStorage.setItem('lastActiveDocId', id);
  }

  getLastActiveDocId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('lastActiveDocId');
  }

  async clear() {
    this.items = [];
    LocalStorageAdapter.clear();
    this.notifyListeners({ type: 'deleted', item: { id: 'all' } as any });
  }

  async restore(items: FileSystemNode[]) {
    this.items = items;
    this.persist();
    this.notifyListeners({ type: 'reloaded', items: this.items });
  }

  subscribe(listener: (event: FileSystemEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: FileSystemEvent) {
    this.listeners.forEach((l) => l(event));
  }

  private persist() {
    LocalStorageAdapter.save(this.items);
  }
}

export const fileSystemStore = new FileSystemStore();
