// src/lib/stores/ttsStore.ts

import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTSService, TTSVoice } from '$lib/services/tts/tts.service';
import { BrowserTTSService } from '$lib/services/tts/BrowserTTSService';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';
import type { Unsubscriber } from 'svelte/store';
import type { Editor } from '@tiptap/core';

// --- Types ---

export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'playing'
  | 'paused'
  | 'error';

// Represents a single word and its exact position in the document.
interface WordSegment {
  word: string;
  from: number;
  to: number;
}

export interface ReadableNode {
  pos: number; // Position of the listItem node.
  node: ProseMirrorNode;
  title: string;
  textToSpeak: string;
  wordMap: WordSegment[]; // The pre-calculated map of all words in the node.
}

export interface TTSState {
  status: TTSStatus;
  nodesToRead: ReadableNode[];
  currentNodeIndex: number;
  decorationSet: DecorationSet;
  availableVoices: TTSVoice[];
  selectedVoiceId: string | null;
  rate: number;
  pitch: number;
  error: string | null;
  currentSpeechId: string | null; // ID to prevent race conditions
}

const initialState: TTSState = {
  status: 'idle',
  nodesToRead: [],
  currentNodeIndex: 0,
  decorationSet: DecorationSet.empty,
  availableVoices: [],
  selectedVoiceId: null,
  rate: 1,
  pitch: 1,
  error: null,
  currentSpeechId: null,
};

// --- Store Creation ---
const ttsService: TTSService = new BrowserTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;
let unsubscribeFromEditor: Unsubscriber | null = null;

// --- Helper Function ---

/**
 * Scans the editor document and extracts all readable nodes (headings and list items)
 * in the order they appear.
 * @param editor The Tiptap editor instance.
 * @returns An array of readable nodes.
 */
function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    // Process Headings (h1, h2, h3, etc.)
    if (node.type.name === 'heading' && node.textContent.trim()) {
      const text = node.textContent.trim();
      const wordMap: WordSegment[] = [];
      const words = text.match(/\S+/g) || [];
      let currentIndex = 0;
      const textStartPos = pos + 1;

      words.forEach((word) => {
        const wordIndex = text.indexOf(word, currentIndex);
        if (wordIndex !== -1) {
          wordMap.push({
            word,
            from: textStartPos + wordIndex,
            to: textStartPos + wordIndex + word.length,
          });
          currentIndex = wordIndex + word.length;
        }
      });

      nodes.push({
        pos,
        node,
        title: text,
        textToSpeak: text,
        wordMap,
      });
      // Don't descend into heading's children (just text nodes)
      return false;
    }

    // Process ListItems
    if (node.type.name === 'listItem' && node.textContent.trim()) {
      const wordMap: WordSegment[] = [];
      let title = '';
      let fullText = '';

      node.forEach((child, offset) => {
        if (child.type.name === 'paragraph' && child.textContent.trim()) {
          const paragraphText = child.textContent;
          const paragraphStartPos = pos + 1 + offset;

          if (!title) {
            title = paragraphText.trim();
          }

          const words = paragraphText.match(/\S+/g) || [];
          let currentIndex = 0;
          words.forEach((word) => {
            const wordIndex = paragraphText.indexOf(word, currentIndex);
            if (wordIndex !== -1) {
              wordMap.push({
                word,
                from: paragraphStartPos + wordIndex,
                to: paragraphStartPos + wordIndex + word.length,
              });
              currentIndex = wordIndex + word.length;
            }
          });

          fullText += paragraphText.trim() + '. ';
        }
      });

      if (wordMap.length > 0) {
        nodes.push({
          pos,
          node,
          title,
          textToSpeak: fullText.trim(),
          wordMap,
        });
      }
      // Don't descend into listItem's children (nested lists will be found by the main loop)
      return false;
    }
    return true;
  });
  return nodes;
}

// --- Actions ---

async function startReading() {
  const currentStatus = get(store).status;
  if (['playing', 'paused', 'initializing'].includes(currentStatus)) {
    return;
  }
  update((s) => ({ ...s, status: 'initializing', error: null }));

  try {
    if (get(store).availableVoices.length === 0) await initialize();
    if (get(store).status === 'error') return;

    const editor = get(editorStore).instance;
    if (!editor) throw new Error('Editor not available.');

    const nodes = getReadableNodes(editor);

    if (nodes.length === 0) {
      toast.info('No readable content found in this document.');
      set({ ...get(store), status: 'idle' });
      return;
    }

    ttsService.cancel();
    update((s) => ({ ...s, nodesToRead: nodes, currentNodeIndex: 0 }));
    speakNodeAtIndex(0);
  } catch (e: any) {
    errorService.reportError(e, { operation: 'ttsStore.startReading' });
    update((s) => ({
      ...s,
      status: 'error',
      error: e.message || 'Could not start reading.',
    }));
  }
}

async function startReadingFromNode(nodeId: string) {
  const currentStatus = get(store).status;
  if (['playing', 'paused', 'initializing'].includes(currentStatus)) {
    return;
  }
  update((s) => ({ ...s, status: 'initializing', error: null }));

  try {
    if (get(store).availableVoices.length === 0) await initialize();
    if (get(store).status === 'error') return;

    const editor = get(editorStore).instance;
    if (!editor) throw new Error('Editor not available.');

    const nodes = getReadableNodes(editor);

    if (nodes.length === 0) {
      toast.info('No readable content found in this document.');
      set({ ...get(store), status: 'idle' });
      return;
    }

    const startIndex = nodes.findIndex((n) => n.node.attrs.nodeId === nodeId);

    if (startIndex === -1) {
      toast.error('Could not find the selected node to start reading from.');
      set({ ...get(store), status: 'idle' });
      return;
    }

    ttsService.cancel();
    update((s) => ({ ...s, nodesToRead: nodes, currentNodeIndex: startIndex }));
    speakNodeAtIndex(startIndex);
  } catch (e: any) {
    errorService.reportError(e, {
      operation: 'ttsStore.startReadingFromNode',
      nodeId,
    });
    update((s) => ({
      ...s,
      status: 'error',
      error: e.message || 'Could not start reading from the selected node.',
    }));
  }
}

function speakNodeAtIndex(index: number) {
  const state = get(store);
  if (index >= state.nodesToRead.length) {
    stopReading(false);
    toast.success('Schema reading complete!');
    return;
  }

  const speechId = uuidv4();
  update((s) => ({
    ...s,
    currentNodeIndex: index,
    status: 'playing',
    currentSpeechId: speechId,
  }));
  highlightCurrentNode();

  const currentNode = state.nodesToRead[index];
  const { selectedVoiceId, rate, pitch } = state;

  if (!selectedVoiceId) {
    update((s) => ({ ...s, status: 'error', error: 'No voice is selected.' }));
    return;
  }

  ttsService.speak(currentNode.textToSpeak, {
    voiceId: selectedVoiceId,
    rate,
    pitch,
    onEnd: () => {
      if (get(store).currentSpeechId === speechId) {
        speakNodeAtIndex(get(store).currentNodeIndex + 1);
      }
    },
    onBoundary: (event) =>
      handleWordBoundary(event, currentNode.textToSpeak, currentNode.wordMap),
    onError: (error) => {
      errorService.reportError(error, { operation: 'ttsService.speak' });
      if (get(store).currentSpeechId === speechId) {
        update((s) => ({
          ...s,
          status: 'error',
          error: 'An error occurred during playback.',
        }));
      }
    },
  });
}

function handleWordBoundary(
  event: SpeechSynthesisEvent,
  fullText: string,
  wordMap: WordSegment[]
) {
  const state = get(store);
  const editor = get(editorStore).instance;
  if (!editor || state.status !== 'playing') return;

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const spokenText = fullText.substring(0, event.charIndex);
  const wordIndex = (spokenText.match(/\S+/g) || []).length;

  const currentWord = wordMap[wordIndex];
  if (!currentWord) return;

  const { from, to } = currentWord;

  const decorations = [
    Decoration.node(
      currentNodeInfo.pos,
      currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
      { class: 'is-current-tts-node' }
    ),
    Decoration.inline(from, to, { class: 'is-current-tts-word' }),
  ];

  const newDecorationSet = DecorationSet.create(editor.state.doc, decorations);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);

  if (!editor || !['playing', 'paused'].includes(state.status)) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const nodeDecoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    { class: 'is-current-tts-node' }
  );

  update((s) => ({
    ...s,
    decorationSet: DecorationSet.create(editor.state.doc, [nodeDecoration]),
  }));
}

async function initialize() {
  if (get(store).availableVoices.length > 0) return;

  try {
    await ttsService.initialize();
    const voices = ttsService.getVoices();
    if (voices.length === 0)
      throw new Error('No TTS voices found in this browser.');

    const userLang = navigator.language || 'en-US';
    const defaultVoice =
      voices.find((v) => v.lang === userLang) ||
      voices.find((v) => v.lang.startsWith(userLang.split('-')[0])) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    update((s) => ({
      ...s,
      availableVoices: voices,
      selectedVoiceId: defaultVoice.id,
      error: null,
    }));
  } catch (e: any) {
    errorService.reportError(e, { operation: 'ttsStore.initialize' });
    update((s) => ({
      ...s,
      status: 'error',
      error: e.message || 'Could not initialize the voice engine.',
    }));
  }
}

function stopReading(reset: boolean) {
  ttsService.cancel();
  if (reset) {
    const currentState = get(store);
    set({
      ...initialState,
      availableVoices: currentState.availableVoices,
      selectedVoiceId: currentState.selectedVoiceId,
      rate: currentState.rate,
      pitch: currentState.pitch,
    });
  } else {
    update((s) => ({
      ...s,
      status: 'idle',
      decorationSet: DecorationSet.empty,
      currentSpeechId: null,
    }));
  }
  highlightCurrentNode();
}

function pauseReading() {
  if (get(store).status === 'playing') {
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
    highlightCurrentNode();
  }
}

function resumeReading() {
  if (get(store).status === 'paused') {
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  }
}

function nextNode() {
  const state = get(store);
  if (state.currentNodeIndex < state.nodesToRead.length - 1) {
    ttsService.cancel();
    speakNodeAtIndex(state.currentNodeIndex + 1);
  }
}

function previousNode() {
  const state = get(store);
  if (state.currentNodeIndex > 0) {
    ttsService.cancel();
    speakNodeAtIndex(state.currentNodeIndex - 1);
  }
}

function restartCurrentSpeech() {
  const state = get(store);
  if (['playing', 'paused'].includes(state.status)) {
    ttsService.cancel();
    setTimeout(() => {
      if (['playing', 'paused'].includes(get(store).status)) {
        speakNodeAtIndex(get(store).currentNodeIndex);
      }
    }, 50);
  }
}

function setVoice(voiceId: string) {
  update((s) => ({ ...s, selectedVoiceId: voiceId }));
  restartCurrentSpeech();
}

function setRate(rate: number) {
  update((s) => ({ ...s, rate }));
  restartCurrentSpeech();
}

// --- Lifecycle ---
editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) unsubscribeFromEditor();
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    const handleTransaction = () => {
      const state = get(store);
      const previousDoc = get(editorStore).doc;
      if (
        ['playing', 'paused'].includes(state.status) &&
        previousDoc &&
        !editor.state.doc.eq(previousDoc)
      ) {
        toast.info('Playback stopped due to document changes.');
        stopReading(true);
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => editor.off('transaction', handleTransaction);
  }
});

export const ttsStore = {
  subscribe,
  initialize,
  startReading,
  startReadingFromNode,
  stopReading: () => stopReading(true),
  pauseReading,
  resumeReading,
  setVoice,
  setRate,
  nextNode,
  previousNode,
};
