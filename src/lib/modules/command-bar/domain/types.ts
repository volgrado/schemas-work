/**
 * @file types.ts
 * @module command-bar
 * @description
 * Defines the domain types for the Command Bar module.
 */

import type { IconName } from '$lib/core/domain/iconName';

export namespace Search {
  export interface Command {
    id: string;
    label: string;
    icon: IconName;
    action: (event?: MouseEvent) => void | Promise<void>;
    isEnabled?: () => boolean;
  }

  export interface ContentResult {
    docId: string;
    title: string;
    snippet: string;
    score: number;
    path?: string;
    nodeId?: string;
  }

  export type ResultItem = ContentResult | Command;

  export interface ResultGroup {
    type: 'Knowledge' | 'Commands';
    items: ResultItem[];
  }
}
