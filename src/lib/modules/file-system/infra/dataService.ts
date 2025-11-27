/**
 * @file dataService.ts
 * @service
 * @description
 * A unified Data Access Layer (Facade) that coordinates operations across the
 * different persistence stores (FileSystem, Yjs, Dexie).
 *
 * This service ensures transactional integrity, particularly for deletion operations,
 * ensuring that when a node is removed from the file system, all associated data
 * (documents, cards) is also cleaned up.
 */

import { fileSystemStore } from '$lib/modules/file-system';
import * as cardService from '$lib/modules/study/domain/cardService';
import * as persistenceService from '$lib/core/services/persistenceService';
import * as errorService from '$lib/core/services/errorService';

export const dataService = {
  /**
   * Deletes a node (file or folder) and all its descendants, ensuring complete cleanup
   * of all associated data (Yjs documents and Dexie cards).
   *
   * @param id The ID of the node to delete.
   */
  async deleteNode(id: string): Promise<void> {
    try {
      // 1. Identify all nodes to be deleted (the target node + all descendants)
      const targetNode = fileSystemStore.getItem(id);
      if (!targetNode) {
        console.warn(
          `[DataService] Attempted to delete non-existent node: ${id}`
        );
        return;
      }

      const descendants = fileSystemStore.getDescendants(id);
      const allNodes = [targetNode, ...descendants];

      console.log(
        `[DataService] Deleting node ${id} and ${descendants.length} descendants.`
      );

      // 2. Perform data cleanup for each node
      // We do this in parallel for performance, but we catch errors to ensure
      // we try to clean up as much as possible.
      await Promise.all(
        allNodes.map(async (node) => {
          // Only 'schema' nodes (documents) have associated data in Yjs/Dexie
          if (node.type === 'schema') {
            try {
              await Promise.all([
                cardService.deleteCardsByDeckId(node.id),
                persistenceService.deleteDocument(node.id),
              ]);
            } catch (err) {
              // Log but don't stop the process; we want to delete the FS node anyway
              errorService.reportError(err, {
                operation: 'dataService.cleanupNode',
                nodeId: node.id,
              });
            }
          }
        })
      );

      // 3. Update the File System State
      // This removes the nodes from the UI and the structure store.
      await fileSystemStore.deleteItem(id);

      console.log(
        `[DataService] Successfully deleted node ${id} and cleaned up data.`
      );
    } catch (error) {
      errorService.reportError(error, {
        operation: 'dataService.deleteNode',
        id,
      });
      throw error; // Re-throw so the UI can handle it (e.g., show a toast)
    }
  },
};
