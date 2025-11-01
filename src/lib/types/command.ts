import type { SearchResult as ContentResult } from '$lib/services/features/searchService';
import type { IconName } from '$lib/types/iconName';

// --- THIS IS YOUR NEW, SUPERIOR INTERFACE ---
export interface Command {
  id: string;
  label: string;
  icon: IconName;
  action: (event?: MouseEvent) => void | Promise<void>;
  isEnabled?: () => boolean;
  subItems?: Command[]; // Note: We won't implement sub-item rendering in this step, but the type supports it for the future.
}

// These types remain the same
export type ResultItem = ContentResult | Command;

export interface SearchResultGroup {
  type: 'Knowledge' | 'Commands';
  items: ResultItem[];
}
