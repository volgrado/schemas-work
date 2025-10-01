// src/lib/services/features/commandService.ts

/**
 * @file Este servicio es el corazón de la CommandBar.
 * Centraliza la definición de todos los comandos disponibles en la aplicación,
 * desacoplando la lógica de negocio de la capa de presentación (el componente Svelte).
 *
 * RESPONSABILIDADES:
 * 1.  Definir la estructura de un comando a través de la interfaz `Command`.
 * 2.  Importar los stores y servicios necesarios para ejecutar las acciones.
 * 3.  Proporcionar funciones que devuelven listas de comandos (`getCommands`, `getAiCommands`)
 *     basándose en el estado actual de la aplicación (ej. si hay un nodo seleccionado).
 *
 * BENEFICIOS DE ESTA ARQUITECTURA:
 * -   **Testeabilidad:** Cada `action` puede ser probada unitariamente sin renderizar la UI.
 * -   **Mantenibilidad:** Añadir o modificar comandos se hace en un único lugar.
 * -   **Claridad:** El componente `CommandBar.svelte` se vuelve un "componente tonto"
 *     enfocado únicamente en renderizar y delegar eventos.
 */

// --- Tipos ---
// Asumimos que Tarea 1.1 ya se ha completado y este tipo existe.
import type { Command } from '$lib/types/command';

// --- Stores (para ejecutar acciones y comprobar estado) ---
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';

/**
 * Devuelve la lista de comandos para la vista principal de la CommandBar.
 * @returns {Command[]} Un array de comandos principales.
 */
export function getCommands(): Command[] {
  return [
    {
      id: 'new-schema',
      label: 'Nuevo Esquema',
      icon: 'plus',
      action: () => {
        // Por defecto, se crea en la raíz. El usuario puede moverlo después.
        documentStore.createNewDocument('Nuevo Esquema', undefined, null);
        commandBarStore.close();
      },
    },
    {
      id: 'switch-schema',
      label: 'Explorar Esquemas...',
      icon: 'folder',
      action: () => {
        // En lugar de manejar la lógica de la UI aquí, le decimos al store
        // que cambie su vista interna. El componente reaccionará a esto.
        commandBarStore.setView('list-schemas');
      },
    },
    {
      id: 'ai-submenu',
      label: 'Asistente de IA...',
      icon: 'sparkles',
      action: () => {
        commandBarStore.setView('ai-actions');
      },
    },
    {
      id: 'start-review',
      label: 'Iniciar Repaso',
      icon: 'zap',
      action: () => {
        reviewStore.startReview();
        commandBarStore.close();
      },
      // El comando se deshabilita si ya hay un repaso en curso.
      isEnabled: () => !get(reviewStore).isReviewing,
    },
    {
      id: 'read-aloud',
      label: 'Leer Esquema',
      icon: 'volume-2',
      action: () => {
        ttsStore.startReading();
        commandBarStore.close();
      },
      // El comando se deshabilita si ya se está leyendo en voz alta.
      isEnabled: () => !get(ttsStore).isPlaying,
    },
    {
      id: 'export-vault',
      label: 'Exportar Bóveda',
      icon: 'download-cloud',
      action: () => {
        // El comando no gestiona el modal directamente.
        // Delega en el store la apertura del modal con la acción correcta.
        commandBarStore.openPasswordModal('export');
      },
    },
    {
      id: 'import-vault',
      label: 'Importar Bóveda',
      icon: 'upload-cloud',
      action: () => {
        commandBarStore.openPasswordModal('import');
      },
    },
    {
      id: 'report-problem',
      label: 'Diagnóstico y Reporte de Errores',
      icon: 'help-circle',
      action: () => {
        commandBarStore.openDiagnosticModal();
      },
    },
  ];
}
/**
 * Devuelve la lista de comandos para el sub-menú de "Asistente de IA".
 * @returns {Command[]} Un array de comandos de IA.
 */
export function getAiCommands(): Command[] {
  // La comprobación de `isEnabled` se basa en el estado actual del `editorStore`.
  const isNodeSelected = get(editorStore).selectedNodePos !== null;

  return [
    {
      id: 'create-schema-from-text',
      label: 'Crear Esquema desde Texto...',
      icon: 'sparkles',
      action: () => {
        // De nuevo, delegamos en el store la apertura del modal de ayuda de IA.
        commandBarStore.openAiHelper('create-schema-from-text');
      },
    },
    {
      id: 'generate-flashcards',
      label: 'Generar Tarjetas de Estudio',
      icon: 'zap',
      action: () => {
        commandBarStore.openAiHelper('generate-flashcards');
      },
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: 'Expandir este nodo',
      icon: 'plus',
      action: () => {
        commandBarStore.openAiHelper('expand-node');
      },
      isEnabled: () => isNodeSelected,
    },
  ];
}
