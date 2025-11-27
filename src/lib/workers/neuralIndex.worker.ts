/**
 * @file neuralIndex.worker.ts
 * @worker
 * @description
 * A Web Worker dedicated to the CPU-intensive task of parsing and chunking large
 * documents for the Neural Index (Search).
 *
 * Moving this logic to a worker prevents the main thread from freezing when
 * processing large schemas, ensuring a smooth UI experience.
 *
 * Algorithm:
 * - Scans the Tiptap JSON structure.
 * - Identifies "Term/Definition" patterns (Headings followed by Paragraphs).
 * - Extracts text and IDs for embedding.
 */

export interface TiptapNode {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs?: {
    level?: number;
    nodeId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  content?: TiptapNode[];
  text?: string;
}

export interface WorkerMessage {
  type: 'atomize';
  docId: string;
  docJson: { content?: TiptapNode[] };
}

export interface WorkerResponse {
  type: 'atomized';
  docId: string;
  chunks: { id: string; content: string }[];
}

// --- Event Handler ---

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, docId, docJson } = e.data;

  if (type === 'atomize') {
    try {
      const chunks = atomizeDocument(docJson);
      const response: WorkerResponse = { type: 'atomized', docId, chunks };
      self.postMessage(response);
    } catch (error) {
      console.error('[NeuralIndexWorker] Error during atomization:', error);
    }
  }
};

// --- Logic ---

/**
 * Parses the document tree to find semantic "chunks".
 * Currently optimized for "Term (Heading) -> Description (Paragraph)" pairs.
 *
 * @param docJson - The raw Tiptap document.
 * @returns Array of chunks with ID and plain text content.
 */
function atomizeDocument(docJson: { content?: TiptapNode[] }): { id: string; content: string }[] {
  const chunks: { id: string; content: string }[] = [];
  
  if (!docJson || !docJson.content || !Array.isArray(docJson.content)) {
    return chunks;
  }

  const nodes = docJson.content;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Pattern Match: Heading (Level 2 or 3) followed immediately by a Paragraph
    if (
      node.type === 'heading' &&
      node.attrs &&
      (node.attrs.level === 2 || node.attrs.level === 3) &&
      i + 1 < nodes.length
    ) {
      const nextNode = nodes[i + 1];

      if (
        nextNode.type === 'paragraph' &&
        (nextNode.content || []).length > 0
      ) {
        // Extract text content safely
        const term = (node.content || [])
          .map((c) => c.text || '')
          .join('');
        const description = (nextNode.content || [])
          .map((c) => c.text || '')
          .join('');
        const nodeId = node.attrs.nodeId;

        // If valid pair found, add to index
        if (term.trim() && description.trim() && nodeId) {
          chunks.push({
            id: nodeId,
            content: `Term: ${term.trim()}\nDescription: ${description.trim()}`,
          });
        }
      }
    }
  }
  return chunks;
}
