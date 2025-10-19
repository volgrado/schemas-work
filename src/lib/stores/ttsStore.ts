/**
 * @file Manages the global state and orchestration for the Text-to-Speech (TTS) feature.
 * @module ttsStore
 *
 * @remarks
 * This store orchestrates the entire Text-to-Speech (TTS) feature. It acts as a high-level
 * state machine, managing everything from initializing the underlying speech synthesis engine to
 * building a playable queue, tracking playback progress, and highlighting the text in the editor
 * as it's being spoken.
 *
 * ### Architectural Role
 *
 * - **Complex Feature Controller**: This is one of the most complex stores in the application,
 *   showcasing a rich set of responsibilities. It manages not just UI state (`status`, `rate`,
 *   `selectedVoiceId`), but also a data queue (`nodesToRead`) and direct interaction with a
 *   browser API via a service abstraction (`ttsService`).
 *
 * - **Service Abstraction**: The store does not interact with the `SpeechSynthesis` Web API
 *   directly. Instead, it uses a `TTSService` interface (`BrowserTTSService`). This is an
 *   important architectural choice. It decouples the store's logic from the specific
 *   implementation of the TTS engine. This would make it easier to swap in a different TTS
 *   provider in the future (e.g., a cloud-based AI voice service) without having to rewrite the
 *   entire store. The new provider would just need to implement the `TTSService` interface.
 *
 * - **Editor Integration for Highlighting**: A key feature is the real-time highlighting of spoken
 *   text. The store achieves this by interacting with the `editorStore`.
 *   1. It generates a `wordMap` for each `ReadableNode`, pre-calculating the exact document
 *      position of every word.
 *   2. It listens to the `onBoundary` event from the `ttsService`.
 *   3. In the `handleWordBoundary` function, it uses this event to find the currently spoken word
 *      in the `wordMap` and creates a ProseMirror `Decoration` to apply a CSS class to it.
 *   4. The new `DecorationSet` is committed to the store, which causes the `DocumentView` to
 *      update the editor's appearance.
 *   This creates a highly dynamic and interactive experience that is tightly coupled to the editor's
 *   state.
 *
 * - **Robust State and Race Condition Management**: Speaking is an asynchronous, time-based
 *   operation with many events (`onEnd`, `onError`, `onBoundary`). The store carefully manages
 *   its state (`status`) and uses a unique `currentSpeechId` (a UUID) for each utterance. Notice
 *   how the event handlers always check if the `currentSpeechId` still matches the one from the
 *   state. This prevents race conditions, for example, if the user quickly stops and starts a new
 *   speech request, the `onEnd` event from the old, cancelled speech won't incorrectly trigger
 *   the `nextNode` action.
 *
 * - **Reactive to Document Changes**: The store subscribes to the `editorStore` and listens for
 *   transactions. If the document is modified while TTS is active, it automatically stops playback.
 *   This prevents the playback from going out of sync with the document content and avoids potential
 *   errors with stale node positions in the `nodesToRead` queue.
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
import { t } from '$lib/utils/i18n';

/**
 * Defines the possible playback statuses of the TTS engine.
 */
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'playing'
  | 'paused'
  | 'error';

/**
 * Represents a block of text that can be read aloud, corresponding to a ProseMirror node.
 */
export interface ReadableNode {
  /** The start position of the node in the document. */
  pos: number;
  /** The ProseMirror node object. */
  node: ProseMirrorNode;
  /** A truncated title for the node, for display in the UI. */
  title: string;
  /** The full text content of the node to be spoken. */
  textToSpeak: string;
  /** A map of each word's exact position for highlighting. */
  wordMap: { word: string; from: number; to: number }[];
}

/**
 * Defines the complete state of the TTS feature.
 */
export interface TTSState {
  /** The current playback status. */
  status: TTSStatus;
  /** The queue of nodes to be read. */
  nodesToRead: ReadableNode[];
  /** The index of the currently playing node in the queue. */
  currentNodeIndex: number;
  /** A ProseMirror `DecorationSet` for highlighting. */
  decorationSet: DecorationSet;
  /** A list of all available TTS voices. */
  availableVoices: TTSVoice[];
  /** The ID of the currently selected voice. */
  selectedVoiceId: string | null;
  /** The playback rate (speed). */
  rate: number;
  /** The playback pitch. */
  pitch: number;
  /** An error message, if any. */
  error: string | null;
  /** A unique ID for the current speech utterance to prevent race conditions. */
  currentSpeechId: string | null;
}

/**
 * The initial state of the TTS store.
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
 * Scans the editor document and extracts all readable nodes.
 * @internal
 * @param editor The Tiptap editor instance.
 * @returns An array of readable nodes.
 */
function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === 'heading' || node.type.name === 'listItem') &&
      node.textContent.trim()
    ) {
      const textToSpeak = node.textContent.trim();
      const wordMap: { word: string; from: number; to: number }[] = [];
      let offset = 0;
      textToSpeak.split(/\s+/).forEach((word) => {
        if (word) {
          const from = pos + 1 + offset;
          const to = from + word.length;
          wordMap.push({ word, from, to });
          offset = to - pos - 1 + 1;
        }
      });

      nodes.push({
        pos,
        node,
        title:
          textToSpeak.substring(0, 50) + (textToSpeak.length > 50 ? '...' : ''),
        textToSpeak,
        wordMap,
      });
    }
    return node.type.name !== 'listItem';
  });
  return nodes;
}

/**
 * Initiates speech synthesis for the node at a given index.
 * @internal
 * @param index The index of the node to speak.
 */
function speakNodeAtIndex(index: number) {
  const state = get(store);
  if (index < 0 || index >= state.nodesToRead.length) {
    stopReading(true);
    toast.success(get(t)('tts.finished_reading_toast'));
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
      if (get(store).currentSpeechId === speechId) {
        nextNode();
      }
    },
    onError: (error) => {
      if (get(store).currentSpeechId === speechId) {
        errorService.reportError(error, { operation: 'tts.speakNode' });
        update((s) => ({
          ...s,
          status: 'error',
          error: get(t)('tts.playback_error'),
        }));
      }
    },
    onBoundary: (event) => {
      if (get(store).currentSpeechId === speechId) {
        handleWordBoundary(event, nodeToRead.wordMap);
      }
    },
  });
}

/**
 * Handles the `onboundary` event to highlight the currently spoken word.
 * @internal
 * @param event The speech synthesis boundary event.
 * @param wordMap The word map for the current node.
 */
function handleWordBoundary(
  event: SpeechSynthesisEvent,
  wordMap: ReadableNode['wordMap']
) {
  const editor = get(editorStore).instance;
  if (!editor) return;

  const state = get(store);
  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const spokenText = currentNode.textToSpeak;
  const charIndex = event.charIndex;

  const currentWord = wordMap.find((w) => {
    const wordStartIndex = spokenText.indexOf(w.word);
    const wordEndIndex = wordStartIndex + w.word.length;
    return charIndex >= wordStartIndex && charIndex < wordEndIndex;
  });

  if (currentWord) {
    const wordDeco = Decoration.inline(currentWord.from, currentWord.to, {
      class: 'is-current-tts-word',
    });
    const nodeDeco = Decoration.node(
      currentNode.pos,
      currentNode.pos + currentNode.node.nodeSize,
      { class: 'is-current-tts-node' }
    );
    update((s) => ({
      ...s,
      decorationSet: DecorationSet.create(editor.state.doc, [
        nodeDeco,
        wordDeco,
      ]),
    }));
  }
}

/**
 * Applies a decoration to highlight the entire node being read.
 * @internal
 */
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || state.nodesToRead.length === 0) return;

  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const deco = Decoration.node(
    currentNode.pos,
    currentNode.pos + currentNode.node.nodeSize,
    { class: 'is-current-tts-node' }
  );
  update((s) => ({
    ...s,
    decorationSet: DecorationSet.create(editor.state.doc, [deco]),
  }));
}

/**
 * Stops playback and optionally resets the TTS state.
 * @internal
 * @param reset If true, resets all state.
 */
function stopReading(reset: boolean) {
  ttsService.cancel();
  document.body.classList.remove('is-reading-aloud'); // IMPROVEMENT: Remove global state class
  if (reset) {
    set(initialState);
  } else {
    update((s) => ({
      ...s,
      status: 'idle',
      decorationSet: DecorationSet.empty,
      currentSpeechId: null,
    }));
  }
}

/**
 * Skips to the next node in the reading queue.
 * @internal
 */
function nextNode() {
  ttsService.cancel();
  const currentIndex = get(store).currentNodeIndex;
  speakNodeAtIndex(currentIndex + 1);
}

editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) unsubscribeFromEditor();
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    let previousDoc: ProseMirrorNode | null = editor.state.doc;

    const handleTransaction = () => {
      const state = get(store);
      const currentDoc = editor.state.doc;
      if (
        ['playing', 'paused'].includes(state.status) &&
        previousDoc &&
        !currentDoc.eq(previousDoc)
      ) {
        toast.info(get(t)('tts.stopped_due_to_changes_toast'));
        stopReading(true);
      }
      previousDoc = currentDoc;
    };

    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
      previousDoc = null;
    };
  }
});

/**
 * The public interface for the `ttsStore`.
 */
export const ttsStore = {
  subscribe,

  /**
   * Initializes the TTS engine and fetches available voices.
   */
  async initialize(): Promise<void> {
    if (get(store).availableVoices.length > 0) return;

    update((s) => ({ ...s, status: 'initializing' }));
    try {
      await ttsService.initialize();
      const voices = ttsService.getVoices();
      const preferredVoice =
        voices.find((v) => v.id.includes('Google') && v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      update((s) => ({
        ...s,
        status: 'idle',
        availableVoices: voices,
        selectedVoiceId: preferredVoice ? preferredVoice.id : null,
      }));
    } catch (error) {
      errorService.reportError(error, { operation: 'tts.initialize' });
      update((s) => ({
        ...s,
        status: 'error',
        error: get(t)('tts.init_error'),
      }));
      throw error;
    }
  },

  /**
   * Starts reading the document from the beginning.
   */
  async startReading(): Promise<void> {
    const editor = get(editorStore).instance;
    if (!editor) return;

    await this.initialize();
    const nodes = getReadableNodes(editor);
    if (nodes.length === 0) {
      toast.info(get(t)('tts.no_readable_content_toast'));
      return;
    }

    document.body.classList.add('is-reading-aloud'); // IMPROVEMENT: Add global state class
    update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
    speakNodeAtIndex(0);
  },

  /**
   * Starts reading from a specific node in the document.
   * @param nodeId The ID of the node from which to start reading.
   */
  async startReadingFromNode(nodeId: string): Promise<void> {
    const editor = get(editorStore).instance;
    if (!editor) return;

    await this.initialize();
    const nodes = getReadableNodes(editor);
    const startIndex = nodes.findIndex((n) => n.node.attrs.nodeId === nodeId);

    if (startIndex === -1) {
      toast.error(get(t)('tts.node_not_found_error'));
      return;
    }

    document.body.classList.add('is-reading-aloud'); // IMPROVEMENT: Add global state class
    update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
    speakNodeAtIndex(startIndex);
  },

  /** Stops the current playback and resets the TTS state. */
  stopReading: () => stopReading(true),

  /** Pauses the current playback. */
  pauseReading: () => {
    const state = get(store);
    if (state.status !== 'playing') return;
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
  },

  /** Resumes a paused playback. */
  resumeReading: () => {
    const state = get(store);
    if (state.status !== 'paused') return;
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  },

  /**
   * Sets the active TTS voice.
   * @param voiceId The unique ID of the voice to use.
   */
  setVoice: (voiceId: string) => {
    update((s) => ({ ...s, selectedVoiceId: voiceId }));
    if (['playing', 'paused'].includes(get(store).status)) {
      ttsService.cancel();
      speakNodeAtIndex(get(store).currentNodeIndex);
    }
  },

  /**
   * Sets the TTS playback rate.
   * @param rate The new playback rate (e.g., 1.25 for 25% faster).
   */
  setRate: (rate: number) => {
    update((s) => ({ ...s, rate }));
    if (['playing', 'paused'].includes(get(store).status)) {
      ttsService.cancel();
      speakNodeAtIndex(get(store).currentNodeIndex);
    }
  },

  /** Skips to the next readable node in the queue. */
  nextNode: () => nextNode(),

  /** Skips to the previous readable node in the queue. */
  previousNode: () => {
    ttsService.cancel();
    const currentIndex = get(store).currentNodeIndex;
    speakNodeAtIndex(currentIndex - 1);
  },
};
