/**
 * Wraps matching substrings in a <mark> tag for highlighting.
 *
 * IMPORTANT: This function returns raw HTML. You MUST use `@html` in Svelte to render it.
 * To prevent XSS vulnerabilities, ensure the 'text' input comes from a trusted source
 * (like your database) and not directly from user input that is then stored and rendered.
 * In this case, `result.snippet` is trusted.
 *
 * @param text The text to highlight within (e.g., a search result snippet).
 * @param query The search query containing words to highlight.
 * @returns An HTML string with matches wrapped in <mark> tags.
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) {
    return text;
  }

  // Create a regex that matches any of the words in the query, case-insensitively.
  const queryWords = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars

  if (queryWords.length === 0) {
    return text;
  }

  const regex = new RegExp(`(${queryWords.join('|')})`, 'gi');

  return text.replace(regex, '<mark>$1</mark>');
}
