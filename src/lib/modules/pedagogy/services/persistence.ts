
/**
 * Persistence Adapter Interface
 * Defines the contract for storing and retrieving pedagogy data.
 */

import type { CurriculumNode } from '../domain/models';

export interface IPersistenceAdapter {
  /**
   * Retrieves a single node by its ID.
   */
  getNode(id: string): Promise<CurriculumNode | null>;

  /**
   * Saves or updates a node.
   */
  saveNode(node: CurriculumNode): Promise<void>;

  /**
   * Retrieves all nodes in the curriculum.
   * @param filter Optional filter criteria
   */
  getAllNodes(filter?: Partial<CurriculumNode>): Promise<CurriculumNode[]>;

  /**
   * Bulk save for initial seeding or sync.
   */
  saveNodes(nodes: CurriculumNode[]): Promise<void>;
}

import Dexie, { type Table } from 'dexie';

/**
 * Dexie Database Definition
 */
class PedagogyDatabase extends Dexie {
  nodes!: Table<CurriculumNode, string>;

  constructor() {
    super('PedagogyDB');
    this.version(1).stores({
      nodes: 'id, level, type, status' // Index key fields
    });
  }
}

export class DexiePersistenceAdapter implements IPersistenceAdapter {
  private db = new PedagogyDatabase();

  async getNode(id: string): Promise<CurriculumNode | null> {
    return (await this.db.nodes.get(id)) || null;
  }

  async saveNode(node: CurriculumNode): Promise<void> {
    await this.db.nodes.put(node);
  }

  async getAllNodes(filter?: Partial<CurriculumNode>): Promise<CurriculumNode[]> {
    if (filter) {
      // Simple filtering on indexed fields if available, or in-memory filter
      // For now, we fetch all and filter in memory for complex queries
      const all = await this.db.nodes.toArray();
      return all.filter(node => {
        return Object.entries(filter).every(([key, value]) => {
          // @ts-ignore
          return node[key] === value;
        });
      });
    }
    return await this.db.nodes.toArray();
  }

  async saveNodes(nodes: CurriculumNode[]): Promise<void> {
    await this.db.nodes.bulkPut(nodes);
  }
}
