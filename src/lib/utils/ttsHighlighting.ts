/**
 * Helper to wrap a text range in a highlight span for karaoke effect.
 * Used primarily in NodeDetailPanel for TTS visualization.
 */
export function highlightRange(element: HTMLElement, start: number, end: number) {
  // First, clean up any existing highlights
  const existing = element.querySelectorAll('.is-current-tts-word');
  existing.forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    }
  });

  if (start >= end) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let current = 0;
  let node: Node | null;
  
  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    const len = text.length;
    
    if (current + len > start && current < end) {
      const range = document.createRange();
      const nodeStart = Math.max(0, start - current);
      const nodeEnd = Math.min(len, end - current);
      
      try {
        range.setStart(node, nodeStart);
        range.setEnd(node, nodeEnd);
        
        const wrapper = document.createElement('span');
        wrapper.className = 'is-current-tts-word';
        range.surroundContents(wrapper);
        return;
      } catch (e) {
        console.warn('Karaoke highlight failed:', e);
      }
    }
    current += len;
  }
}

/**
 * Clears any existing karaoke highlights from the element.
 */
export function clearHighlights(element: HTMLElement) {
  const existing = element.querySelectorAll('.is-current-tts-word');
  existing.forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    }
  });
}
