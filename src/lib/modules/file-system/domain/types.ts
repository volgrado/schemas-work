export interface FileSystemNode {
  id: string;
  title: string;
  type: 'schema' | 'folder';
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type FileSystemEvent =
  | { type: 'created'; item: FileSystemNode }
  | { type: 'updated'; item: FileSystemNode }
  | { type: 'deleted'; item: FileSystemNode }
  | { type: 'reloaded'; items: FileSystemNode[] };
