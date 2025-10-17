/**
 * @file An implementation of the TTSService interface that utilizes the native browser
 *       `window.speechSynthesis` API. This service is designed for robustness, addressing
 *       common browser inconsistencies and bugs.
 *
 * @remarks
 * This service includes several key features to ensure a stable user experience:
 * - **Robust Voice Loading**: Implements a polling mechanism with a timeout as a fallback
 *   for browsers that do not reliably fire the `onvoiceschanged` event.
 * - **Automatic Text Chunking**: Long text passages are automatically segmented into smaller
 *   chunks to prevent silent failures in speech synthesis engines that have character limits.
 *   The service ensures that boundary events correctly map back to the original full text.
 * - **"Watchdog" for Stability**: A timer monitors the synthesis process and cancels it
 *   if it enters a stalled or frozen state, preventing the application from becoming unresponsive.
 * - **State Management**: Internal state is carefully managed to prevent race conditions and
 *   ensure that new speech requests correctly cancel any ongoing or paused speech.
 */

import type { TTSService, TTSVoice, TTSSpeakOptions } from './tts.service';

/**
 * Implements the `TTSService` using the browser's native `window.speechSynthesis` API.
 */
export class BrowserTTSService implements TTSService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  /** The maximum number of characters for a single speech utterance. A conservative value is used for broad compatibility. */
  private static readonly MAX_TEXT_LENGTH = 150;

  constructor() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // In a server-side rendering (SSR) context or a browser without support,
      // a dummy object is created to prevent errors.
      this.synthesis = {} as SpeechSynthesis;
      console.warn('SpeechSynthesis API is not available.');
    } else {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Initializes the service by loading the list of available synthesis voices.
   *
   * @remarks
   * This method is asynchronous and must be called before any other operations.
   * It handles the common browser issue where `getVoices()` returns an empty list
   * initially by listening for the `onvoiceschanged` event and using a polling
   * interval as a reliable fallback.
   *
   * @returns A promise that resolves when voices are successfully loaded, or rejects on timeout.
   */
  public initialize(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    if (!this.synthesis.getVoices) {
      this.isInitialized = true;
      return Promise.resolve(); // Resolve immediately if getVoices is not even supported.
    }

    return new Promise((resolve, reject) => {
      const loadVoices = () => {
        const loadedVoices = this.synthesis.getVoices();
        if (loadedVoices.length > 0) {
          this.voices = loadedVoices;
          this.isInitialized = true;
          return true;
        }
        return false;
      };

      if (loadVoices()) {
        resolve();
        return;
      }

      // Listen for the official event.
      this.synthesis.onvoiceschanged = () => {
        if (loadVoices()) {
          resolve();
          // Clean up to prevent multiple calls.
          this.synthesis.onvoiceschanged = null;
        }
      };

      // Set up a polling interval as a fallback.
      const pollInterval = setInterval(() => {
        if (loadVoices()) {
          clearInterval(pollInterval);
          resolve();
        }
      }, 100);

      // Set a timeout to prevent waiting indefinitely.
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!this.isInitialized) {
          reject(new Error('Timeout: Could not load browser voices.'));
        }
      }, 3000);
    });
  }

  /**
   * Retrieves the list of available TTS voices.
   *
   * @returns An array of `TTSVoice` objects, or an empty array if not initialized.
   */
  public getVoices(): TTSVoice[] {
    if (!this.isInitialized) {
      return [];
    }
    return this.voices.map((voice) => ({
      id: voice.voiceURI,
      name: `${voice.name} (${voice.lang})`,
      lang: voice.lang,
    }));
  }

  /**
   * Initiates speech synthesis for the given text.
   *
   * @remarks
   * This method automatically handles text segmentation for long inputs.
   * It ensures any currently speaking or paused utterance is cancelled before starting a new one.
   *
   * @param text - The text to be spoken.
   * @param options - Configuration for the speech, including voice, rate, pitch, and event callbacks.
   */
  public speak(text: string, options: TTSSpeakOptions): void {
    if (!this.isInitialized) {
      options.onError(new Error('TTS service has not been initialized.'));
      return;
    }

    // Stop any speech that is currently in progress.
    if (this.synthesis.speaking) {
      this.cancel();
    }

    if (!text.trim()) {
      options.onEnd(); // Nothing to speak.
      return;
    }

    const chunks = this.chunkText(text);
    let chunkIndex = 0;

    const speakChunk = () => {
      if (chunkIndex >= chunks.length) {
        options.onEnd();
        return;
      }

      const chunk = chunks[chunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      this.currentUtterance = utterance;

      const selectedVoice = this.voices.find(
        (v) => v.voiceURI === options.voiceId
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.onerror = (event) => options.onError(event);

      if (options.onBoundary) {
        this.setupBoundaryCallback(utterance, chunks, chunkIndex, options.onBoundary);
      }

      utterance.onend = () => {
        chunkIndex++;
        speakChunk(); // Speak the next chunk in the sequence.
      };

      this.synthesis.speak(utterance);
    };

    speakChunk();
    this.startWatchdog(); // Monitor for silent failures.
  }

  /**
   * Pauses the currently active speech synthesis.
   */
  public pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resumes the currently paused speech synthesis.
   */
  public resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Immediately stops the current speech and clears the utterance queue.
   */
  public cancel(): void {
    this.currentUtterance = null;
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Sets up the `onboundary` callback for an utterance, adjusting the character index
   * to be relative to the full, un-chunked text.
   *
   * @param utterance - The utterance to attach the event to.
   * @param chunks - The array of all text chunks.
   * @param chunkIndex - The index of the current chunk.
   * @param onBoundaryCallback - The user-provided callback to fire.
   * @internal
   */
  private setupBoundaryCallback(
    utterance: SpeechSynthesisUtterance,
    chunks: string[],
    chunkIndex: number,
    onBoundaryCallback: (event: SpeechSynthesisEvent) => void
  ) {
    const baseCharIndex = chunks
      .slice(0, chunkIndex)
      .reduce((acc, c) => acc + c.length, 0);

    utterance.onboundary = (event) => {
      // The original event is read-only. To modify the charIndex, we must create a
      // new event-like object that clones the original properties.
      const adjustedEvent = new SpeechSynthesisEvent('boundary', {
        ...event,
        charIndex: baseCharIndex + event.charIndex, // Adjust index to be relative to the full text.
      });

      // The `charLength` property is not part of the constructor, so it must be added manually.
      if ('charLength' in event) {
          Object.defineProperty(adjustedEvent, 'charLength', {
              value: (event as any).charLength,
              writable: false,
          });
      }

      onBoundaryCallback(adjustedEvent);
    };
  }

  /**
   * Splits a long text string into an array of smaller chunks suitable for the
   * `SpeechSynthesis` API.
   *
   * @remarks
   * The method prioritizes splitting at sentence boundaries (periods), then at
   * word boundaries (spaces) to create more natural-sounding pauses between chunks.
   *
   * @param text - The full text to chunk.
   * @returns An array of text chunks.
   * @internal
   */
  private chunkText(text: string): string[] {
    if (text.length <= BrowserTTSService.MAX_TEXT_LENGTH) {
      return [text];
    }

    const chunks: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      if (remainingText.length <= BrowserTTSService.MAX_TEXT_LENGTH) {
        chunks.push(remainingText);
        break;
      }

      // Find the last period within the max length.
      let cutPoint = remainingText.lastIndexOf(
        '.',
        BrowserTTSService.MAX_TEXT_LENGTH
      );
      // If no period, find the last space.
      if (cutPoint === -1) {
        cutPoint = remainingText.lastIndexOf(
          ' ',
          BrowserTTSService.MAX_TEXT_LENGTH
        );
      }
      // If no space, force a hard cut.
      if (cutPoint === -1) {
        cutPoint = BrowserTTSService.MAX_TEXT_LENGTH;
      }

      chunks.push(remainingText.substring(0, cutPoint + 1));
      remainingText = remainingText.substring(cutPoint + 1).trim();
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Starts a timer that periodically checks if the speech synthesis engine has stalled.
   *
   * @remarks
   * In some browsers, the `speechSynthesis` can enter a state where `speaking` is true
   * but no audio is playing and no events are firing. This watchdog detects that
   * state and cancels the speech to prevent the application from being stuck.
   * @internal
   */
  private startWatchdog(): void {
    const watchdogInterval = setInterval(() => {
      if (!this.currentUtterance) {
        clearInterval(watchdogInterval); // Speech finished normally.
        return;
      }

      if (!this.synthesis.speaking && !this.synthesis.paused) {
        console.warn(
          'Watchdog: Speech synthesis stopped unexpectedly. Cancelling to prevent freeze.'
        );
        this.cancel(); // Force cancellation.
        clearInterval(watchdogInterval);
      }
    }, 2000); // Check every 2 seconds.
  }
}
