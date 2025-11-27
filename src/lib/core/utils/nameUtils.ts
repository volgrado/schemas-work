import type { SchemaMetadata } from '$lib/types';

/**
 * Generates a unique name by appending (1), (2), etc. if duplicates exist.
 * @param baseTitle - The desired title
 * @param parentId - The parent folder ID
 * @param allItems - All existing items
 * @returns A unique title with numbering if needed
 */
export function generateUniqueName(
  baseTitle: string,
  parentId: string | null,
  allItems: SchemaMetadata[]
): string {
  const trimmedBase = baseTitle.trim();
  const siblings = allItems.filter((item) => item.parentId === parentId);

  // Check if base title is available
  if (
    !siblings.some((s) => s.title.toLowerCase() === trimmedBase.toLowerCase())
  ) {
    return trimmedBase;
  }

  // Find next available number
  let counter = 1;
  while (true) {
    const candidate = `${trimmedBase} (${counter})`;
    if (
      !siblings.some((s) => s.title.toLowerCase() === candidate.toLowerCase())
    ) {
      return candidate;
    }
    counter++;
  }
}
