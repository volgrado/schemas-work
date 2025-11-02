/**
 * Wraps matching substrings in a <mark> tag for highlighting.
 * This function uses a hybrid approach:
 * 1. It prioritizes matching the entire query phrase, including spaces.
 * 2. It then falls back to highlighting individual words from the query in the remaining text.
 *
 * IMPORTANT: This function returns raw HTML. You MUST use `@html` in Svelte to render it.
 * To prevent XSS vulnerabilities, ensure the 'text' input comes from a trusted source.
 *
 * @param text The text to highlight within (e.g., a search result snippet).
 * @param query The search query.
 * @returns An HTML string with matches wrapped in <mark> tags.
 */
export function highlightText(text: string, query: string): string {
  const trimmedQuery = query.trim();

  // If there's no text or no query, return the original text.
  if (!trimmedQuery || !text) {
    return text;
  }

  // --- 1. Prepare for Phrase Matching ---
  // Escape the entire phrase for use in a regex.
  const escapedPhrase = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Create a regex that will be used to split the text by the full phrase.
  // The capturing group `()` is crucial because it makes `split()` keep the separator.
  const phraseRegex = new RegExp(`(${escapedPhrase})`, 'gi');

  // --- 2. Prepare for Individual Word Matching (as a fallback) ---
  const queryWords = trimmedQuery
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape each word

  if (queryWords.length === 0) {
    return text; // Safety check
  }
  const wordRegex = new RegExp(`(${queryWords.join('|')})`, 'gi');

  // --- 3. The Hybrid "Split and Process" Algorithm ---

  // Split the text by the full phrase. The result is an array of alternating
  // non-matching parts and matching phrases.
  // e.g., 'abc PHRASE def'.split(/(PHRASE)/) -> ['abc ', 'PHRASE', ' def']
  const parts = text.split(phraseRegex);

  const highlightedParts = parts.map((part) => {
    // Check if this part is a full phrase match (case-insensitive).
    if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
      // It's a phrase match. Wrap the whole thing in a single <mark> tag.
      return `<mark>${part}</mark>`;
    } else {
      // It's not a phrase match (it's the text *between* phrases).
      // Run the original individual word highlighter on this part as a fallback.
      return part.replace(wordRegex, '<mark>$1</mark>');
    }
  });

  // Join the processed parts back together into a single HTML string.
  return highlightedParts.join('');
}
