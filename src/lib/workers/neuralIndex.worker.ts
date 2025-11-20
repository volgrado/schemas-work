/**
 * @file Web Worker for Neural Indexing
 * @description Handles the CPU-intensive task of atomizing documents into chunks
 * to prevent blocking the main thread.
 */

export interface WorkerMessage {
  type: 'atomize';
  docId: string;
  docJson: any; // Tiptap/ProseMirror document JSON
}

export interface WorkerResponse {
  type: 'atomized';
  docId: string;
  chunks: { id: string; content: string }[];
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, docId, docJson } = e.data;

  if (type === 'atomize') {
    try {
      const chunks = atomizeDocument(docJson);
      const response: WorkerResponse = { type: 'atomized', docId, chunks };
      self.postMessage(response);
    } catch (error) {
      console.error('Worker error during atomization:', error);
      // In a real scenario, we might want to send an error message back
    }
  }
};

/**
 * Atomizes a Tiptap document JSON into "Term/Description" chunks based on heading levels.
 */
function atomizeDocument(docJson: any): { id: string; content: string }[] {
  const chunks: { id: string; content: string }[] = [];
  
  // Ensure we have content to process
  if (!docJson || !docJson.content || !Array.isArray(docJson.content)) {
    return chunks;
  }

  const nodes = docJson.content;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
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
        const term = (node.content || [])
          .map((c: any) => c.text || '')
          .join('');
        const description = (nextNode.content || [])
          .map((c: any) => c.text || '')
          .join('');
        const nodeId = node.attrs.nodeId;

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
