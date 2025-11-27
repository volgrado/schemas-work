import type { TTSService, TTSVoice, TTSSpeakOptions } from '../domain/ttsService';

/**
 * Implementation of the TTSService using the browser's Web Speech API.
 */
export class WebSpeechTTSService implements TTSService {
  private voices: TTSVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Speech Synthesis not supported in this environment.');
    }

    return new Promise((resolve) => {
      let resolved = false;

      const loadVoices = () => {
        const browserVoices = window.speechSynthesis.getVoices();
        if (browserVoices.length > 0) {
          this.voices = browserVoices.map((v) => ({
            id: v.voiceURI,
            name: `${v.name} (${v.lang})`,
            lang: v.lang,
          }));
          
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      };

      loadVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          console.warn('WebSpeechTTSService: Voices loading timed out or no voices found.');
          resolved = true;
          resolve();
        }
      }, 2000);
    });
  }

  getVoices(): TTSVoice[] {
    return this.voices;
  }

  async speak(text: string, options?: TTSSpeakOptions): Promise<void> {
    this.cancel(); // Ensure any previous speech is stopped

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      if (options?.voiceId) {
        const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === options.voiceId);
        if (voice) utterance.voice = voice;
      }

      if (options?.rate !== undefined) utterance.rate = options.rate;
      if (options?.pitch !== undefined) utterance.pitch = options.pitch;
      if (options?.volume !== undefined) utterance.volume = options.volume;

      utterance.onend = () => {
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        // Ignore interrupted errors as they are often intentional (cancellation)
        if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve(); // Resolve gracefully on cancellation
            return;
        }
        
        if (options?.onError) {
            options.onError(new Error(event.error));
        }
        // We resolve here to avoid unhandled promise rejections for playback errors, 
        // letting the onError callback handle the reporting.
        resolve(); 
      };

      if (options?.onBoundary) {
        utterance.onboundary = options.onBoundary;
      }

      // Small timeout to ensure clean state transition in some browsers
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 10);
    });
  }

  pause(): void {
    window.speechSynthesis.pause();
  }

  resume(): void {
    window.speechSynthesis.resume();
  }

  cancel(): void {
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
  }
}
