// src/lib/stores/ttsStore.ts

import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore'; // *** NUEVO *** Importamos el editorStore para reaccionar a sus cambios.
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Define la estructura del estado para el modo de Lectura en Voz Alta (TTS).
 */
export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  nodesToRead: { pos: number; node: ProseMirrorNode; text: string }[];
  currentNodeIndex: number;
  decorationSet: DecorationSet;
}

/**
 * El estado inicial del store cuando no hay una lectura activa.
 */
const initialState: TTSState = {
  isPlaying: false,
  isPaused: false,
  nodesToRead: [],
  currentNodeIndex: 0,
  decorationSet: DecorationSet.empty,
};

// --- Creación del Store ---
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;

// *** NUEVO *** Lógica de Sincronización con el Editor
// Esta sección soluciona el defecto crítico de desincronización de estado.
let unsubscribeFromEditor: (() => void) | null = null;

editorStore.subscribe(($editorStore) => {
  // Si ya existía una suscripción a una instancia de editor anterior, la limpiamos para evitar fugas de memoria.
  if (unsubscribeFromEditor) {
    unsubscribeFromEditor();
    unsubscribeFromEditor = null;
  }

  // Si el editorStore nos proporciona una nueva instancia de editor...
  if ($editorStore.instance) {
    const editor = $editorStore.instance;

    // ...creamos un listener para el evento 'transaction'. Este evento se dispara con CADA cambio en el documento.
    const handleTransaction = () => {
      const state = get(store); // Obtenemos el estado actual del ttsStore.

      // Si la lectura en voz alta está activa (`isPlaying`) cuando ocurre un cambio,
      // detenemos la lectura para evitar que el estado (posiciones de nodos, etc.) se vuelva inválido.
      if (state.isPlaying) {
        console.warn(
          'Se detectó un cambio en el documento mientras se leía. Deteniendo la lectura para evitar errores.'
        );
        stopReading();
      }
    };

    // Adjuntamos nuestro listener al editor.
    editor.on('transaction', handleTransaction);

    // Guardamos una función de "limpieza" que nos permitirá eliminar el listener
    // cuando el editor se destruya o cambie.
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

// --- Funciones Internas ---

/**
 * Itera al siguiente nodo en la cola, lo lee en voz alta y establece un
 * callback para continuar con el siguiente cuando termine.
 */
function speakNextNode() {
  const state = get(store);

  // Si hemos terminado de leer todos los nodos, detenemos el proceso.
  if (state.currentNodeIndex >= state.nodesToRead.length) {
    stopReading();
    return;
  }

  // Resaltamos el nodo que estamos a punto de leer.
  highlightCurrentNode();

  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const utterance = new SpeechSynthesisUtterance(currentNode.text);

  // Evento clave: cuando el navegador termina de decir la frase,
  // avanzamos al siguiente nodo y llamamos a esta función de nuevo.
  utterance.onend = () => {
    // Solo procedemos si la lectura no ha sido pausada o detenida.
    if (get(store).isPlaying && !get(store).isPaused) {
      update((s) => ({ ...s, currentNodeIndex: s.currentNodeIndex + 1 }));
      speakNextNode();
    }
  };

  // Manejo de errores básico.
  utterance.onerror = (event) => {
    console.error('Ocurrió un error en la síntesis de voz:', event);
    stopReading();
  };

  window.speechSynthesis.speak(utterance);
}

// --- Acciones Públicas ---

/**
 * Inicia el modo de lectura en voz alta.
 */
function startReading() {
  const editor = get(editorStore).instance;
  const isAlreadyPlaying = get(store).isPlaying;
  if (!editor || isAlreadyPlaying) return;

  // Detenemos cualquier lectura anterior para asegurar un estado limpio.
  window.speechSynthesis.cancel();

  // Recopilamos todos los nodos `listItem` con contenido de texto.
  const nodes: TTSState['nodesToRead'] = [];
  editor.state.doc.descendants((node, pos) => {
    const textContent = node.textContent.trim();
    if (node.type.name === 'listItem' && textContent.length > 0) {
      nodes.push({ pos, node, text: textContent });
    }
  });

  if (nodes.length === 0) return;

  update((s) => ({
    ...s,
    isPlaying: true,
    isPaused: false,
    nodesToRead: nodes,
    currentNodeIndex: 0,
  }));

  speakNextNode();
}

/** Detiene la lectura en voz alta y resetea el estado del store. */
function stopReading() {
  window.speechSynthesis.cancel();
  set(initialState);
}

/** Pausa la lectura en curso. */
function pauseReading() {
  window.speechSynthesis.pause();
  update((s) => ({ ...s, isPaused: true }));
}

/** Reanuda la lectura pausada. */
function resumeReading() {
  window.speechSynthesis.resume();
  update((s) => ({ ...s, isPaused: false }));
}

/** Resalta el nodo que se está leyendo actualmente. */
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || !state.isPlaying) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const decoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    {
      // Usamos una clase CSS diferente para poder estilizarlo de forma distinta al modo repaso.
      class: 'is-current-tts-node',
    }
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [decoration]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

// --- API Pública del Store ---
export const ttsStore = {
  subscribe,
  startReading,
  stopReading,
  pauseReading,
  resumeReading,
};
