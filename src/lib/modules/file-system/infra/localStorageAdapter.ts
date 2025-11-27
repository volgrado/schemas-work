import type { FileSystemNode } from '../domain/types';
import { DIRECTORY_STORAGE_KEY } from '$lib/constants';

export class LocalStorageAdapter {
  static getAll(): FileSystemNode[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(DIRECTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load directory:', error);
      return [];
    }
  }

  static save(items: FileSystemNode[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save directory:', error);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DIRECTORY_STORAGE_KEY);
  }
}
