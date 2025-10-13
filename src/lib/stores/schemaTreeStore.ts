// src/lib/stores/schemaTreeStore.ts
import { writable } from 'svelte/store';

export interface SchemaTreeState {
  expandedNodeIds: Set<string>;
}

const initialState: SchemaTreeState = {
  expandedNodeIds: new Set(['root-title']),
};

function createSchemaTreeStore() {
  const { subscribe, update } = writable<SchemaTreeState>(initialState);

  return {
    subscribe,
    toggleNode: (nodeId: string) => {
      update((state) => {
        const newSet = new Set(state.expandedNodeIds);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return { ...state, expandedNodeIds: newSet };
      });
    },
    setExpanded: (nodeIds: string[]) => {
      update((state) => ({ ...state, expandedNodeIds: new Set(nodeIds) }));
    },
  };
}

export const schemaTreeStore = createSchemaTreeStore();
