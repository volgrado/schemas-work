// src/lib/services/tts/tts.service.ts

/**
 * Describe la estructura de una voz disponible en un motor de TTS.
 * Es un modelo de datos limpio y agnóstico a la implementación.
 */
export interface TTSVoice {
  id: string; // Identificador único para usar en la API (p.ej. la propiedad `voiceURI`)
  name: string; // Nombre legible para el usuario (p.ej. "Google UK English Female")
  lang: string; // Código de idioma BCP 47 (p.ej. "en-GB")
}

/**
 * Define el conjunto completo de opciones y callbacks para una operación de locución.
 * Esto permite un control granular sobre cada llamada a `speak`.
 */
export interface TTSSpeakOptions {
  /** El identificador único de la voz a utilizar, obtenido de `getVoices()`. */
  voiceId: string;

  /** La velocidad de la locución. El rango típico es 0.5 (lento) a 2 (rápido). */
  rate: number;

  /** El tono de la voz. El rango típico es 0 (bajo) a 2 (alto). */
  pitch: number;

  /** Callback que se ejecuta cuando la locución completa (incluyendo todos los fragmentos) ha terminado exitosamente. */
  onEnd: () => void;

  /** Callback que se ejecuta si ocurre un error durante la síntesis de voz. */
  onError: (error: any) => void;

  /**
   * (Opcional) Callback que se ejecuta cada vez que el motor de voz
   * alcanza un límite de palabra. Esencial para la funcionalidad "karaoke".
   * El evento proporciona información como `charIndex` para saber dónde resaltar.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * La interfaz `TTSService` define el contrato fundamental para cualquier motor de Text-to-Speech.
 *
 * Esta abstracción es el pilar de nuestra arquitectura de audio, permitiéndonos
 * intercambiar la implementación subyacente (p.ej., del navegador a un servicio de IA en la nube)
 * sin necesidad de modificar la lógica de negocio en los stores o componentes.
 */
export interface TTSService {
  /**
   * Inicializa el servicio. Es un paso crítico y a menudo asíncrono,
   * necesario para tareas como la carga de voces desde el sistema operativo o una API.
   * Debe ser llamado antes de cualquier otra operación.
   * @returns {Promise<void>} Una promesa que se resuelve cuando el servicio está listo.
   */
  initialize(): Promise<void>;

  /**
   * Devuelve una lista de todas las voces disponibles después de una inicialización exitosa.
   * @returns {TTSVoice[]} Un array de objetos `TTSVoice`.
   */
  getVoices(): TTSVoice[];

  /**
   * Inicia la locución de un texto dado con las opciones especificadas.
   * La implementación debe manejar la lógica de la cola y la segmentación de texto si es necesario.
   * @param {string} text El texto a sintetizar.
   * @param {TTSSpeakOptions} options El objeto de configuración y callbacks para esta locución.
   */
  speak(text: string, options: TTSSpeakOptions): void;

  /**
   * Pausa la locución que se está reproduciendo actualmente.
   */
  pause(): void;

  /**
   * Reanuda una locución que ha sido pausada.
   */
  resume(): void;

  /**
   * Detiene inmediatamente la locución actual y limpia cualquier
   * fragmento de texto que estuviera en cola para ser reproducido.
   * Resetea el estado del servicio a inactivo.
   */
  cancel(): void;
}
