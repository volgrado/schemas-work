/**
 * @file Manages the global state and orchestration for the entire Text-to-Speech (TTS) feature.
 *
 * @remarks
 * This Svelte store is the central controller for all text-to-speech functionality.
 * It is responsible for a wide range of tasks, including:
 * - Initializing and interacting with the underlying TTS service (e.g., `BrowserTTSService`).
 * - Scanning the editor's document to identify and queue readable content blocks (headings and list items).
 * - Managing the complete playback lifecycle and state (e.g., `playing`, `paused`, `idle`).
 * - Handling all user controls: play, pause, resume, stop, and navigating between content nodes.
 * - Synchronizing with the Tiptap editor to provide real-time highlighting of both the currently spoken word and the containing node (paragraph or heading).
 * - Managing TTS settings such as voice selection, speech rate, and pitch.
 * - Reacting to changes in the editor's content to automatically stop playback if the source document is modified, preventing desynchronization.
 */

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

/**
 * Defines the possible playback statuses of the TTS engine.
 */
export type TTSStatus = 'idle' | 'initializing' | 'playing' | 'paused' | 'error';

/**
 * Represents a single word and its exact start and end positions within the ProseMirror document,
 * which is crucial for enabling real-time, word-by-word highlighting during playback.
 */
interface WordSegment {
  word: string;
  from: number;
  to: number;
}

/**
 * Represents a contiguous block of text that can be read aloud, corresponding to a single
 * ProseMirror node (e.g., a heading or a list item).
 */
export interface ReadableNode {
  /** The start position of the node in the ProseMirror document. */
  pos: number;
  /** The ProseMirror node object itself. */
  node: ProseMirrorNode;
  /** A user-friendly, truncated title for the node, displayed in the TTS controls UI. */
  title: string;
  /** The full, cleaned text content of the node that will be synthesized into speech. */
  textToSpeak: string;
  /** A pre-calculated map of each word's exact position, used for efficient highlighting during playback. */
  wordMap: WordSegment[];
}

/**
 * Defines the complete state of the TTS feature, including playback status, queues, and settings.
 */
export interface TTSState {
  /** The current playback status of the TTS engine. */
  status: TTSStatus;
  /** The queue of `ReadableNode` objects to be read in the current playback session. */
  nodesToRead: ReadableNode[];
  /** The index of the currently playing or paused node within the `nodesToRead` array. */
  currentNodeIndex: number;
  /** A ProseMirror `DecorationSet` used to apply dynamic highlighting styles to the editor content. */
  decorationSet: DecorationSet;
  /** A list of all synthesis voices available from the underlying TTS service. */
  availableVoices: TTSVoice[];
  /** The unique identifier of the currently selected voice. */
  selectedVoiceId: string | null;
  /** The desired playback rate (speed), where 1 is the default. */
  rate: number;
  /** The desired playback pitch, where 1 is the default. */
  pitch: number;
  /** An error message string if the last operation failed, for display in the UI. */
  error: string | null;
  /** A unique identifier for the current speech utterance, used to prevent race conditions from overlapping commands. */
  currentSpeechId: string | null;
}

/**
 * The initial, default state of the TTS store.
 * @internal
 */
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

const ttsService: TTSService = new BrowserTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;
let unsubscribeFromEditor: Unsubscriber | null = null;

/**
 * Scans the editor document and extracts all readable nodes (headings and list items).
 * It processes the text and creates a detailed word map for each node to enable highlighting.
 * @param editor The Tiptap editor instance.
 * @returns An array of `ReadableNode` objects, ready for playback.
 * @internal
 */
function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    if ((node.type.name === 'heading' || node.type.name === 'listItem') && node.textContent.trim()) {
      const textToSpeak = node.textContent.trim();
      const wordMap: WordSegment[] = [];
      let offset = 0;
      // Use a regex to split by whitespace and calculate the precise position of each word.
      textToSpeak.split(/\s+/).forEach((word) => {
        if (word) {
          const from = pos + 1 + offset;
          const to = from + word.length;
          wordMap.push({ word, from, to });
          offset = to - pos - 1 + 1; // +1 to account for the space separator
        }
      });

      nodes.push({
        pos,
        node,
        title: textToSpeak.substring(0, 50) + (textToSpeak.length > 50 ? '...' : ''),
        textToSpeak,
        wordMap,
      });
    }
    // Do not descend into list items, as their content is handled at the `listItem` level itself.
    return node.type.name !== 'listItem';
  });
  return nodes;
}

/**
 * Starts reading the entire document from the beginning.
 */
async function startReading() {
  const editor = get(editorStore).instance;
  if (!editor) return;

  await initialize();
  const nodes = getReadableNodes(editor);
  if (nodes.length === 0) {
    toast.info('There is no readable content in the document.');
    return;
  }

  update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
  speakNodeAtIndex(0);
}

/**
 * Starts reading from a specific node within the document.
 * @param nodeId The `nodeId` attribute of the ProseMirror node from which to start reading.
 */
async function startReadingFromNode(nodeId: string) {
  const editor = get(editorStore).instance;
  if (!editor) return;

  await initialize();
  const nodes = getReadableNodes(editor);
  const startIndex = nodes.findIndex((n) => n.node.attrs.nodeId === nodeId);

  if (startIndex === -1) {
    toast.error('Could not find the specified node to start reading.');
    return;
  }

  update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
  speakNodeAtIndex(startIndex);
}

/**
 * Initiates speech synthesis for the node at a given index in the `nodesToRead` queue.
 * @param index The index of the node to speak.
 * @internal
 */
function speakNodeAtIndex(index: number) {
  const state = get(store);
  if (index < 0 || index >= state.nodesToRead.length) {
    stopReading(true);
    toast.success('Finished reading the document.');
    return;
  }

  const nodeToRead = state.nodesToRead[index];
  const speechId = uuidv4();

  update((s) => ({
    ...s,
    currentNodeIndex: index,
    status: 'playing',
    currentSpeechId: speechId,
  }));

  highlightCurrentNode();

  ttsService.speak(nodeToRead.textToSpeak, {
    voiceId: state.selectedVoiceId!,
    rate: state.rate,
    pitch: state.pitch,
    onEnd: () => {
      // Only proceed if this is still the current speech utterance.
      if (get(store).currentSpeechId === speechId) {
        nextNode();
      }
    },
    onError: (error) => {
      if (get(store).currentSpeechId === speechId) {
        errorService.reportError(error, { operation: 'tts.speakNode' });
        update((s) => ({ ...s, status: 'error', error: 'An error occurred during playback.' }));
      }
    },
    onBoundary: (event) => {
      if (get(store).currentSpeechId === speechId) {
        handleWordBoundary(event, nodeToRead.textToSpeak, nodeToRead.wordMap);
      }
    },
  });
}

/**
 * Handles the `onboundary` event from the TTS service to highlight the currently spoken word in the editor.
 * @internal
 */
function handleWordBoundary(event: SpeechSynthesisEvent, fullText: string, wordMap: WordSegment[]) {
  const { charIndex } = event;
  const currentWord = wordMap.find((w) => charIndex >= fullText.indexOf(w.word) && charIndex < fullText.indexOf(w.word) + w.word.length);
  if (!currentWord) return;

  const editor = get(editorStore).instance;
  if (!editor) return;

  const state = get(store);
  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const wordDeco = Decoration.inline(currentWord.from, currentWord.to, { class: 'tts-highlight-word' });
  const nodeDeco = Decoration.node(currentNode.pos, currentNode.pos + currentNode.node.nodeSize, { class: 'tts-highlight-node' });

  update((s) => ({ ...s, decorationSet: DecorationSet.create(editor.state.doc, [nodeDeco, wordDeco]) }));
}

/**
 * Applies a decoration to highlight the entire ProseMirror node that is currently being read.
 * @internal
 */
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || state.nodesToRead.length === 0) return;

  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const deco = Decoration.node(currentNode.pos, currentNode.pos + currentNode.node.nodeSize, { class: 'tts-highlight-node' });
  update((s) => ({ ...s, decorationSet: DecorationSet.create(editor.state.doc, [deco]) }));
}

/**
 * Initializes the TTS service, fetching available voices and setting a sensible default voice.
 */
async function initialize() {
  if (get(store).availableVoices.length > 0) return; // Avoid re-initialization

  update((s) => ({ ...s, status: 'initializing' }));
  try {
    await ttsService.initialize();
    const voices = ttsService.getVoices();
    // Prefer a Google UK English voice, falling back to any English voice, then the first available voice.
    const preferredVoice = voices.find(v => v.id.includes('Google') && v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
    update((s) => ({
      ...s,
      status: 'idle',
      availableVoices: voices,
      selectedVoiceId: preferredVoice ? preferredVoice.id : null,
    }));
  } catch (error) {
    errorService.reportError(error, { operation: 'tts.initialize' });
    update((s) => ({ ...s, status: 'error', error: 'Could not initialize Text-to-Speech.' }));
    throw error;
  }
}

/**
 * Stops playback and optionally resets the entire TTS state to its initial values.
 * @param reset If true, resets all state; otherwise, just stops playback and clears decorations.
 * @internal
 */
function stopReading(reset: boolean) {
  ttsService.cancel();
  if (reset) {
    set(initialState);
  } else {
    update((s) => ({ ...s, status: 'idle', decorationSet: DecorationSet.empty, currentSpeechId: null }));
  }
}

/**
 * Pauses the current playback at its current position.
 */
function pauseReading() {
  const state = get(store);
  if (state.status !== 'playing') return;
  ttsService.pause();
  update((s) => ({ ...s, status: 'paused' }));
}

/**
 * Resumes playback from a paused state.
 */
function resumeReading() {
  const state = get(store);
  if (state.status !== 'paused') return;
  ttsService.resume();
  update((s) => ({ ...s, status: 'playing' }));
}

/**
 * Skips to the next node in the reading queue.
 */
function nextNode() {
  ttsService.cancel();
  const currentIndex = get(store).currentNodeIndex;
  speakNodeAtIndex(currentIndex + 1);
}

/**
 * Goes back to the previous node in the reading queue.
 */
function previousNode() {
  ttsService.cancel();
  const currentIndex = get(store).currentNodeIndex;
  speakNodeAtIndex(currentIndex - 1);
}

/**
 * Restarts the speech for the currently active node from the beginning. Used after changing voice or rate.
 * @internal
 */
function restartCurrentSpeech() {
  const state = get(store);
  if (['playing', 'paused'].includes(state.status)) {
    ttsService.cancel();
    speakNodeAtIndex(state.currentNodeIndex);
  }
}

/**
 * Sets the active voice and immediately restarts the current speech to apply the change.
 * @param voiceId The unique ID of the voice to use.
 */
function setVoice(voiceId: string) {
  update((s) => ({ ...s, selectedVoiceId: voiceId }));
  restartCurrentSpeech();
}

/**
 * Sets the playback rate and immediately restarts the current speech to apply the change.
 * @param rate The new playback rate (e.g., 1.25 for 25% faster).
 */
function setRate(rate: number) {
  update((s) => ({ ...s, rate }));
  restartCurrentSpeech();
}

// Subscribes to editor transactions to stop playback if the document changes during speech.
editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) unsubscribeFromEditor();
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    let previousDoc: ProseMirrorNode | null = editor.state.doc;

    const handleTransaction = () => {
      const state = get(store);
      const currentDoc = editor.state.doc;
      if (['playing', 'paused'].includes(state.status) && previousDoc && !currentDoc.eq(previousDoc)) {
        toast.info('Playback stopped due to document changes.');
        stopReading(true);
      }
      previousDoc = currentDoc;
    };

    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
      previousDoc = null; // Clear reference on cleanup
    };
  }
});

/**
 * The publicly exposed interface for the `ttsStore`, containing all user-facing actions.
 */
export const ttsStore = {
  /** Subscribes to changes in the TTS store's state. */
  subscribe,
  /** Initializes the TTS engine and fetches available voices. This must be called before starting playback. */
  initialize,
  /** Starts reading the document from the beginning. */
  startReading,
  /** Starts reading from a specific node within the document. */
  startReadingFromNode,
  /** Stops the current playback and fully resets the TTS state. */
  stopReading: () => stopReading(true),
  /** Pauses the current playback. */
  pauseReading,
  /** Resumes a paused playback. */
  resumeReading,
  /** Sets the active TTS voice. Playback will restart on the current node to apply the change. */
  setVoice,
  /** Sets the TTS playback rate (speed). Playback will restart on the current node to apply the change. */
  setRate,
  /** Skips to the next readable node in the queue. */
  nextNode,
  /** Skips to the previous readable node in the queue. */
  previousNode,
};
