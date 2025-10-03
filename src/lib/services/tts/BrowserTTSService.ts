import type { TTSService, TTSVoice, TTSSpeakOptions } from './tts.service';

/**
 * Una implementación robusta y de vanguardia del TTSService que utiliza
 * la API nativa `window.speechSynthesis`.
 *
 * Características clave:
 * - Manejo robusto de la carga de voces con polling y timeouts como fallback.
 * - Mecanismo de "watchdog" para evitar que la síntesis de voz se congele.
 * - Segmentación automática de texto largo para mejorar la fiabilidad en todos los navegadores.
 * - Gestión de estado interno para prevenir comportamientos erráticos.
 */
export class BrowserTTSService implements TTSService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Constante para la segmentación de texto
  private static readonly MAX_TEXT_LENGTH = 150; // Caracteres. Un valor conservador funciona mejor.

  constructor() {
    // Asegurarse de que `speechSynthesis` existe
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // En un entorno de servidor (SSR) o un navegador sin soporte, creamos un 'dummy'
      this.synthesis = {} as SpeechSynthesis;
      console.warn('SpeechSynthesis API no está disponible.');
    } else {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Inicializa el servicio cargando las voces disponibles.
   * Utiliza una estrategia de polling como fallback si el evento 'voiceschanged' no se dispara,
   * un problema común en varios navegadores.
   */
  public initialize(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    // Si estamos en el servidor o la API no existe, no hacemos nada.
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

      // Intento inmediato
      if (loadVoices()) {
        resolve();
        return;
      }

      // Fallback 1: El evento oficial
      this.synthesis.onvoiceschanged = () => {
        if (loadVoices()) {
          resolve();
          this.synthesis.onvoiceschanged = null; // Limpiamos el listener
        }
      };

      // Fallback 2: Polling
      const pollInterval = setInterval(() => {
        if (loadVoices()) {
          clearInterval(pollInterval);
          resolve();
        }
      }, 100);

      // Fallback 3: Timeout de seguridad
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!this.isInitialized) {
          reject(
            new Error('Timeout: No se pudieron cargar las voces del navegador.')
          );
        }
      }, 3000); // 3 segundos es un tiempo razonable
    });
  }

  public getVoices(): TTSVoice[] {
    if (!this.isInitialized) {
      // No es un error grave, puede ocurrir si se llama prematuramente.
      // Devolver un array vacío es un comportamiento seguro.
      return [];
    }
    return this.voices
      .filter((v) => !v.localService) // Filtramos voces locales de baja calidad si es posible
      .map((voice) => ({
        id: voice.voiceURI,
        name: `${voice.name} (${voice.lang})`,
        lang: voice.lang,
      }));
  }

  /**
   * Inicia la locución. Segmenta el texto si es demasiado largo
   * y limpia cualquier estado anterior para evitar bloqueos.
   */
  public speak(text: string, options: TTSSpeakOptions): void {
    if (!this.isInitialized) {
      options.onError(new Error('El servicio TTS no ha sido inicializado.'));
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
        speakChunk(); // Llamada recursiva para el siguiente fragmento
      };

      this.synthesis.speak(utterance);
    };

    speakChunk();
    this.startWatchdog();
  }

  public pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  public resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

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
          'Watchdog: La síntesis de voz se detuvo inesperadamente. Reiniciando.'
        );
        this.cancel();
        clearInterval(watchdogInterval);
      }
    }, 2000);
  }
}
