/**
 * @file Manages Text-to-Speech (TTS) playback using Svelte 5 Runes and the Web Speech API.
 * This store holds the state for TTS, including node/word-level tracking for editor
 * highlighting and persistent, section-based highlighting for the tree visualization.
 */
import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';

import { i18n } from '$lib/utils/i18n.svelte';
import type { TTS } from '$lib/types';


// --- State Definition ---

export interface TTSState {
  status: TTS.Status;
  nodesToRead: TTS.ReadableNode[];
  currentNodeIndex: number;
  availableVoices: TTS.Voice[];
  selectedVoiceId: string | null;
  rate: number;
  volume: number;
  error: string | null;
  isInitialized: boolean;
  isConfigDirty: boolean;
  isServiceReady: boolean;
  currentSpeechId: string | null;
  currentWordRange: { from: number; to: number } | null;
  activeTreeNodeId: string | null; // Tracks the ID of the tree node being narrated
  lastCharIndex: number; // Tracks the last spoken character index for resuming
  isSettingsExpanded: boolean;
}

const initialState: TTSState = {
  status: 'idle',
  nodesToRead: [],
  currentNodeIndex: 0,
  availableVoices: [],
  selectedVoiceId: null,
  rate: 1,
  volume: 1,
  error: null,
  isInitialized: false,
  isConfigDirty: false,
  isServiceReady: false,
  currentSpeechId: null,
  currentWordRange: null,
  activeTreeNodeId: null, // Initialize as null
  lastCharIndex: 0,
  isSettingsExpanded: false,
};

export const ttsState = $state<TTSState>({ ...initialState });

import type { TTSService } from '../domain/ttsService';

// --- Service Instance ---
let ttsService: TTSService;


// --- Private Helper Functions ---

function generateSimpleUUID(): string {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function transitionToIdle(): void {
  ttsService.cancel();
  ttsState.status = 'idle';
  ttsState.error = null;
  ttsState.currentNodeIndex = 0;
  ttsState.nodesToRead = [];
  ttsState.currentSpeechId = null;
  ttsState.currentWordRange = null;
  ttsState.activeTreeNodeId = null; // Reset the active tree node ID
  ttsState.isConfigDirty = false;
  ttsState.lastCharIndex = 0;
}

async function loadVoices(): Promise<void> {
  try {
    await ttsService.initialize();
    const voices = ttsService.getVoices();
    
    if (voices.length > 0) {
      // Map to TTS.Voice type if needed, though they should be compatible
      ttsState.availableVoices = voices;
      
      const voiceExists = voices.some(
        (v) => v.id === ttsState.selectedVoiceId
      );
      if (!ttsState.selectedVoiceId || !voiceExists) {
        const defaultVoice =
          voices.find(
            (v) => v.lang.includes('en') && v.id.includes('local')
          ) ||
          voices.find((v) => v.lang.includes('en')) ||
          voices[0];
        if (defaultVoice) {
          ttsState.selectedVoiceId = defaultVoice.id;
        }
      }
    }
  } catch (error) {
    console.error('TTS: Failed to load voices', error);
    ttsState.error = i18n.t('tts.not_supported');
    ttsState.status = 'error';
    throw error;
  }
}

function speakNodeAtIndex(index: number, startOffset: number = 0): void {
  const { nodesToRead, selectedVoiceId, rate, volume } = ttsState;
  if (index >= nodesToRead.length) {
    toast.success(i18n.t('tts.finished_reading_toast'));
    transitionToIdle();
    return;
  }

  // Clear previous word highlight when moving to a new node.
  ttsState.currentWordRange = null;

  const node = nodesToRead[index];
  const fullText = (node.text || '').trim();
  
  // If we have an offset, slice the text. Otherwise use full text.
  const textToSpeak = startOffset > 0 ? fullText.substring(startOffset) : fullText;

  // --- FINAL, SIMPLIFIED LOGIC FOR PERSISTENT HIGHLIGHT ---
  // The active tree node is ALWAYS the parent heading ID of the current node
  // being read (whether it's a heading or a paragraph). This is provided
  // by our intelligent `getReadableNodes` function.
  // CRITICAL FIX: Ensure we use the node's treeNodeId if it exists (for headings),
  // otherwise fall back to parentHeadingId. This ensures the tree highlights correctly.
  ttsState.activeTreeNodeId = node.treeNodeId ?? node.parentHeadingId ?? null;

  if (!textToSpeak) {
    nextNode();
    return;
  }

  const speechId = generateSimpleUUID();
  
  // Update state BEFORE cancelling to ensure onend handlers from previous utterances
  // know they are stale.
  ttsState.currentNodeIndex = index;
  ttsState.status = 'playing';
  ttsState.currentSpeechId = speechId;

  ttsService.speak(textToSpeak, {
    voiceId: selectedVoiceId || undefined,
    rate,
    volume,
    onBoundary: (event) => {
      if (
        event.name !== 'word' ||
        ttsState.status !== 'playing' ||
        ttsState.currentSpeechId !== speechId
      ) {
        return;
      }
      
      const relativeCharIndex = event.charIndex;
      const absoluteCharIndex = startOffset + relativeCharIndex;
      
      ttsState.lastCharIndex = absoluteCharIndex;

      let charEnd = fullText.substring(absoluteCharIndex).search(/[\s.,;!?\n\r]/);
      if (charEnd === -1) {
        charEnd = fullText.length;
      } else {
        charEnd += absoluteCharIndex;
      }
      if (node.pos >= 0) {
        const from = node.pos + 1 + absoluteCharIndex;
        const to = node.pos + 1 + charEnd;
        ttsState.currentWordRange = { from, to };
      }
    },
    onEnd: () => {
      // Only proceed if this is the CURRENT speech ending naturally.
      if (
        ttsState.status === 'playing' &&
        ttsState.currentSpeechId === speechId
      ) {
        ttsState.currentWordRange = null;
        ttsState.lastCharIndex = 0;
        nextNode();
      }
    },
    onError: (error) => {
      ttsState.currentWordRange = null;
      if (ttsState.currentSpeechId === speechId) {
        console.error('TTS Playback Error:', error);
        ttsState.status = 'error';
        ttsState.error = i18n.t('tts.playback_error');
      }
    }
  });
}

// --- Public Action Functions ---

/**
 * Initializes the TTS system by loading voices.
 * This should be called once from a root component.
 */
export function initialize(service: TTSService): void {
  if (ttsState.isInitialized || !browser) return;
  ttsService = service;

  ttsState.isInitialized = true;
  ttsState.status = 'initializing';

  loadVoices()
    .then(() => {
      ttsState.status = 'idle';
      ttsState.isServiceReady = true;
    })
    .catch((error) => {
      console.error('TTS Initialization failed:', error);
      ttsState.status = 'error';
      ttsState.error = error instanceof Error ? error.message : 'Initialization failed';
    });
}

export function startReading(nodes: TTS.ReadableNode[]): void {
  if (!ttsState.isInitialized || !ttsService) {
    console.warn('TTS: Service not initialized. Call initialize(service) first.');
    return;
  }
  transitionToIdle();
  if (nodes.length === 0) {
    toast.info(i18n.t('tts.no_readable_content_toast'));
    return;
  }
  ttsState.nodesToRead = nodes;
  speakNodeAtIndex(0);
}

export const stopReading = transitionToIdle;

export function pauseReading(): void {
  if (ttsState.status === 'playing') {
    ttsService.pause();
    ttsState.status = 'paused';
  }
}

export function resumeReading(): void {
  if (ttsState.status !== 'paused') return;
  if (ttsState.isConfigDirty) {
    ttsState.isConfigDirty = false;
    speakNodeAtIndex(ttsState.currentNodeIndex);
  } else {
    ttsService.resume();
    ttsState.status = 'playing';
  }
}

function handleSettingChange(updateFn: () => void, toastMessage?: string) {
  updateFn();
  if (ttsState.status === 'playing') {
    // Web Speech API requires restarting the utterance to apply changes.
    // We restart from the last spoken character index to make it feel seamless.
    ttsService.cancel();
    speakNodeAtIndex(ttsState.currentNodeIndex, ttsState.lastCharIndex);
  } else if (ttsState.status === 'paused') {
    ttsState.isConfigDirty = true;
  }
  if (toastMessage) toast.info(toastMessage);
}

export function setVoice(voiceId: string): void {
  handleSettingChange(
    () => (ttsState.selectedVoiceId = voiceId),
    i18n.t('tts.voice_changed_toast')
  );
}
export function setRate(newRate: number): void {
  handleSettingChange(() => (ttsState.rate = newRate));
}
export function setVolume(newVolume: number): void {
  handleSettingChange(() => (ttsState.volume = newVolume));
}

export function nextNode(): void {
  speakNodeAtIndex(ttsState.currentNodeIndex + 1);
}

export function previousNode(): void {
  if (ttsState.currentNodeIndex > 0) {
    speakNodeAtIndex(ttsState.currentNodeIndex - 1);
  }
}

export function replay(): void {
  const currentNodes = [...ttsState.nodesToRead];
  if (currentNodes.length > 0) {
    transitionToIdle();
    setTimeout(() => startReading(currentNodes), 50);
  }
}

export function toggleSettings(): void {
  ttsState.isSettingsExpanded = !ttsState.isSettingsExpanded;
}
