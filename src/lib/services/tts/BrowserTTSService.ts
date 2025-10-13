import type { TTSService, TTSVoice, TTSSpeakOptions } from './tts.service';

/**
 * A robust and state-of-the-art implementation of the TTSService that uses
 * the native `window.speechSynthesis` API.
 *
 * Key features:
 * - Robust handling of voice loading with polling and timeouts as fallbacks.
 * - "Watchdog" mechanism to prevent the speech synthesis from freezing.
 * - Automatic segmentation of long text to improve reliability across all browsers.
 * - Internal state management to prevent erratic behavior.
 */
export class BrowserTTSService implements TTSService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private static readonly MAX_TEXT_LENGTH = 150; // Characters. A conservative value works best.

  constructor() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // In a server environment (SSR) or a browser without support, we create a dummy
      this.synthesis = {} as SpeechSynthesis;
      console.warn('SpeechSynthesis API is not available.');
    } else {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Initializes the service by loading the available voices.
   * It uses a polling strategy as a fallback if the 'voiceschanged' event does not fire,
   * a common issue in several browsers.
   * @returns {Promise<void>} A promise that resolves when the service is initialized.
   */
  public initialize(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    if (!this.synthesis.getVoices) {
      return Promise.resolve();
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

      this.synthesis.onvoiceschanged = () => {
        if (loadVoices()) {
          resolve();
          this.synthesis.onvoiceschanged = null;
        }
      };

      const pollInterval = setInterval(() => {
        if (loadVoices()) {
          clearInterval(pollInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (!this.isInitialized) {
          reject(new Error('Timeout: Could not load browser voices.'));
        }
      }, 3000);
    });
  }

  /**
   * Gets the list of available voices.
   * @returns {TTSVoice[]} An array of available voices.
   */
  public getVoices(): TTSVoice[] {
    if (!this.isInitialized) {
      return [];
    }
    // CAMBIO: Eliminamos el filtro `!v.localService` para incluir las voces del sistema.
    return this.voices.map((voice) => ({
      id: voice.voiceURI,
      name: `${voice.name} (${voice.lang})`,
      lang: voice.lang,
    }));
  }

  /**
   * Starts the speech. Segments the text if it is too long
   * and clears any previous state to avoid blockages.
   * @param {string} text - The text to speak.
   * @param {TTSSpeakOptions} options - The options for speaking.
   */
  public speak(text: string, options: TTSSpeakOptions): void {
    if (!this.isInitialized) {
      options.onError(new Error('TTS service has not been initialized.'));
      return;
    }
    if (this.synthesis.speaking) {
      this.cancel();
    }

    if (!text.trim()) {
      options.onEnd();
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
        const baseCharIndex = chunks.slice(0, chunkIndex).join('').length;
        utterance.onboundary = (event) => {
          if (options.onBoundary) {
            const adjustedEvent = new SpeechSynthesisEvent('boundary', {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              charIndex: baseCharIndex + event.charIndex,
              elapsedTime: event.elapsedTime,
              name: event.name,
              utterance: event.utterance,
            });
            options.onBoundary(adjustedEvent);
          }
        };
      }

      utterance.onend = () => {
        chunkIndex++;
        speakChunk();
      };

      this.synthesis.speak(utterance);
    };

    speakChunk();
    this.startWatchdog();
  }

  /**
   * Pauses the current speech.
   */
  public pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resumes the paused speech.
   */
  public resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Cancels the current speech.
   */
  public cancel(): void {
    this.currentUtterance = null;
    this.synthesis.cancel();
  }

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

      let cutPoint = remainingText.lastIndexOf(
        '.',
        BrowserTTSService.MAX_TEXT_LENGTH
      );
      if (cutPoint === -1) {
        cutPoint = remainingText.lastIndexOf(
          ' ',
          BrowserTTSService.MAX_TEXT_LENGTH
        );
      }
      if (cutPoint === -1) {
        cutPoint = BrowserTTSService.MAX_TEXT_LENGTH;
      }

      chunks.push(remainingText.substring(0, cutPoint + 1));
      remainingText = remainingText.substring(cutPoint + 1).trim();
    }

    return chunks;
  }

  private startWatchdog(): void {
    const watchdogInterval = setInterval(() => {
      if (!this.currentUtterance) {
        clearInterval(watchdogInterval);
        return;
      }

      if (!this.synthesis.speaking && !this.synthesis.paused) {
        console.warn(
          'Watchdog: Speech synthesis stopped unexpectedly. Restarting.'
        );
        this.cancel();
        clearInterval(watchdogInterval);
      }
    }, 2000);
  }
}
