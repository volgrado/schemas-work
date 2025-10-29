/**
 * @file Implements the TTSService interface using a custom backend API that streams
 * audio. This final version is architected as a pure class that operates on a
 * provided HTMLAudioElement, making it decoupled from Svelte's lifecycle and context.
 * @module EdgeAudioTTSService
 */

import type { TTSService, TTSSpeakOptions, TTSVoice } from './ttsService';
import { getAudio } from '$lib/services/core/db.service';

// NOTE: Consider moving this to a dedicated logger utility file (e.g., '$lib/utils/logger.ts')
function sendLogToServer(
  level: 'info' | 'error' | 'fatal',
  message: string,
  data?: any
) {
  try {
    const logData = {
      level,
      message,
      data: data
        ? JSON.stringify(data, (key, value) =>
            value instanceof Error
              ? { message: value.message, stack: value.stack }
              : value
          )
        : undefined,
    };
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
      keepalive: true,
    }).catch(console.error);
  } catch (e) {
    console.error('Failed to send log to server:', e);
  }
}

// --- Constants for configuration and to avoid magic strings ---
const MIME_TYPE = 'audio/webm; codecs=opus';
const API_BASE_URL = '/api/tts';
const VOICES_CONFIG_URL = '/voices.json'; // Path to the external voices file

/** Defines the possible operational states of the service. */
type ServiceStatus = 'idle' | 'caching' | 'streaming' | 'playing' | 'paused';

export class EdgeAudioTTSService implements TTSService {
  private readonly audio: HTMLAudioElement;
  private status: ServiceStatus = 'idle';

  // --- State properties grouped for clarity ---
  private availableVoices: TTSVoice[] = [];
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private currentAudioUrl: string | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private abortController: AbortController | null = null;

  // --- Stable event handlers for adding/removing listeners ---
  private handleEnded = () => {
    this.log('EVENT: Audio element "ended" triggered.');
    this.onEndCallback?.();
    this.resetState(); // Clean up and reset after natural completion.
  };

  /** Unified error handler to ensure consistent logging and state cleanup. */
  private handleError = (error: unknown, context: string) => {
    // Ensure we always work with an Error object.
    const err = error instanceof Error ? error : new Error(String(error));
    // Avoid logging "AbortError" when cancellation is intentional.
    if (err.name === 'AbortError') {
      this.log(`Operation cancelled via AbortController: ${context}`);
      return; // Do not treat cancellation as a user-facing error.
    }

    this.logError(`ERROR during [${context}]`, err);
    this.onErrorCallback?.(err);
    this.resetState(); // CRUCIAL: Always reset state on error to allow recovery.
  };

  private log(message: string, data?: any) {
    const fullMessage = `[EdgeAudioTTSService] ${message}`;
    console.log(fullMessage, data || '');
    sendLogToServer('info', message, data);
  }
  private logError(message: string, error: any) {
    const fullMessage = `[EdgeAudioTTSService] ${message}`;
    console.error(fullMessage, error);
    sendLogToServer('error', message, error);
  }

  constructor(audioElement: HTMLAudioElement) {
    if (!audioElement) {
      throw new Error(
        'EdgeAudioTTSService: An HTMLAudioElement must be provided.'
      );
    }
    this.audio = audioElement;
    this.log('Service instantiated. Call initialize() to make it ready.');
  }

  /**
   * Centralized cleanup method. Resets all state variables and removes listeners,
   * returning the service to a pristine 'idle' state.
   */
  private resetState(): void {
    this.log('Resetting service state.');

    // Abort any in-flight fetch requests.
    this.abortController?.abort();

    // Remove listeners from the audio element.
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('error', (e) =>
      this.handleError(e, 'HTMLAudioElement internal error')
    );

    // Safely clean up MediaSource if it exists.
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          this.sourceBuffer.abort();
        }
        // Check state again as it might have changed.
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      } catch (e) {
        this.logError('Non-critical error during MediaSource cleanup', e);
      }
    }

    // Stop playback and release resources.
    this.audio.pause();
    this.audio.removeAttribute('src');
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }

    // Nullify all state properties.
    this.status = 'idle';
    this.onEndCallback = null;
    this.onErrorCallback = null;
    this.currentAudioUrl = null;
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.abortController = null;
  }

  /**
   * Initializes the service by fetching the available voices from an external
   * configuration file. This method must be called and awaited before any
   * other operations are performed.
   */
  public async initialize(): Promise<void> {
    // Make the method idempotent: do not re-fetch if already initialized.
    if (this.availableVoices.length > 0) {
      this.log('Service already initialized.');
      return;
    }

    try {
      this.log(
        `Initializing service by fetching voices from ${VOICES_CONFIG_URL}...`
      );
      const response = await fetch(VOICES_CONFIG_URL);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch voices.json: Status ${response.status}`
        );
      }

      const voicesData: TTSVoice[] = await response.json();
      this.availableVoices = voicesData;

      this.log(`Successfully loaded ${this.availableVoices.length} voices.`);
    } catch (error) {
      this.logError('FATAL: Could not initialize TTSService', error);
      // Re-throw the error so the calling application knows initialization failed
      // and can display an appropriate error message to the user.
      throw error;
    }
  }

  /**
   * Retrieves the list of available voices.
   * This method should only be called after initialize() has successfully completed.
   * @returns {TTSVoice[]} An array of `TTSVoice` objects.
   */
  public getVoices(): TTSVoice[] {
    if (this.availableVoices.length === 0) {
      console.warn(
        '[EdgeAudioTTSService] getVoices() called before initialize() was completed. Returning empty array.'
      );
    }
    return this.availableVoices;
  }

  /**
   * Initiates speech synthesis of a given text.
   * @returns {Promise<void>} A promise that resolves when playback has successfully started,
   * or rejects if there's a setup error.
   */
  public async speak(
    text: string,
    options: TTSSpeakOptions & { audioId?: string }
  ): Promise<void> {
    // Pre-condition check: Ensure service is ready.
    if (this.availableVoices.length === 0) {
      throw new Error(
        'TTS Service has not been initialized. Please call and await initialize() first.'
      );
    }

    this.log(`speak() called for text: "${text.substring(0, 30)}..."`);
    this.resetState(); // Always start from a clean slate.

    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;
    this.abortController = new AbortController();

    // Attach listeners for this specific operation.
    this.audio.addEventListener('ended', this.handleEnded, { once: true });
    this.audio.addEventListener(
      'error',
      (e) => this.handleError(e, 'HTMLAudioElement internal error'),
      { once: true }
    );

    try {
      // 1. Attempt to play from cache (IndexedDB)
      if (options.audioId) {
        this.status = 'caching';
        const audioBlob = await getAudio(options.audioId);
        if (audioBlob) {
          this.log('SUCCESS: Found audio in cache.');
          this.currentAudioUrl = URL.createObjectURL(audioBlob);
          this.audio.src = this.currentAudioUrl;
          this.audio.playbackRate = options.rate;
          await this.audio.play();
          this.status = 'playing';
          return; // Success, we are done.
        }
        this.log('INFO: Audio not found in cache, proceeding to stream.');
      }

      // 2. Stream from API
      this.status = 'streaming';
      await this.streamFromApi(text, options);
      this.status = 'playing'; // Transition to 'playing' after streaming setup is complete.
    } catch (error) {
      this.handleError(error, 'speak setup');
      // Re-throw the error to reject the promise, fulfilling the interface contract.
      throw error;
    }
  }

  private async streamFromApi(
    text: string,
    options: TTSSpeakOptions
  ): Promise<void> {
    if (!MediaSource.isTypeSupported(MIME_TYPE)) {
      throw new Error(`Streaming with ${MIME_TYPE} is not supported.`);
    }

    this.mediaSource = new MediaSource();
    this.currentAudioUrl = URL.createObjectURL(this.mediaSource);
    this.audio.src = this.currentAudioUrl;
    this.audio.playbackRate = options.rate;

    // We wrap the 'sourceopen' event in a Promise to allow awaiting the setup phase.
    return new Promise((resolve, reject) => {
      this.mediaSource!.addEventListener(
        'sourceopen',
        async () => {
          if (!this.mediaSource)
            return reject(new Error('MediaSource lost during open.'));

          try {
            // It's a good practice to revoke the URL as soon as the media element is using it.
            URL.revokeObjectURL(this.currentAudioUrl!);

            this.sourceBuffer = this.mediaSource.addSourceBuffer(MIME_TYPE);

            const encodedText = encodeURIComponent(text);
            const fetchUrl = `${API_BASE_URL}?text=${encodedText}&voice=${options.voiceId}`;
            const response = await fetch(fetchUrl, {
              signal: this.abortController!.signal,
            });

            if (!response.ok || !response.body) {
              throw new Error(`TTS API Error (Status ${response.status})`);
            }

            // Important: Start playback now. This resolves the outer `speak` promise.
            await this.audio.play();
            resolve();

            // Asynchronously pipe the stream to the source buffer after resolving.
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                // Ensure value is not undefined
                await this.appendBuffer(value);
              }
            }

            // Signal that no more data is coming.
            if (this.mediaSource.readyState === 'open') {
              this.mediaSource.endOfStream();
            }
          } catch (error) {
            reject(error); // Reject the promise if setup fails.
          }
        },
        { once: true }
      );
    });
  }

  private appendBuffer(chunk: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const sb = this.sourceBuffer;
      if (!sb) return reject(new Error('SourceBuffer is not initialized.'));

      const doAppend = () => {
        try {
          sb.addEventListener('updateend', () => resolve(), { once: true });
          sb.addEventListener('error', (e) => reject(e), { once: true });
          // --- DEFINITIVE FIX IS HERE ---
          // Use a type assertion to satisfy the strict type requirement.
          sb.appendBuffer(chunk.buffer as ArrayBuffer);
        } catch (error) {
          reject(error);
        }
      };

      // If the buffer is busy, wait for it to finish before appending.
      if (sb.updating) {
        sb.addEventListener('updateend', doAppend, { once: true });
      } else {
        doAppend();
      }
    });
  }

  public pause(): void {
    if (this.status === 'playing') {
      this.log('pause() called.');
      this.audio.pause();
      this.status = 'paused';
    } else {
      this.log(`WARN: pause() called in invalid state: ${this.status}`);
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.log('resume() called.');
      this.audio
        .play()
        .then(() => {
          this.status = 'playing';
        })
        .catch((e) => this.handleError(e, 'resume playback'));
    } else {
      this.log(`WARN: resume() called in invalid state: ${this.status}`);
    }
  }

  public cancel(): void {
    this.log('cancel() called.');
    this.resetState();
  }
}
