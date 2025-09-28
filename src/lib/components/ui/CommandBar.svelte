<!-- src/lib/components/ui/CommandBar.svelte (VERSIÓN FINAL CON STORE) -->
<script lang="ts">
  // --- Svelte Core ---
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { z } from 'zod';

  import { get } from 'svelte/store';

  // --- Componentes de UI ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import AIHelperModal from '$lib/components/ai/AIHelperModal.svelte';

  // --- Lógica de la Aplicación (Stores y Servicios) ---
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import { reviewStore } from '$lib/stores/reviewStore';
  import { ttsStore } from '$lib/stores/ttsStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as backupService from '$lib/services/features/backupService';
  import * as Prompts from '$lib/services/ai/prompts';

  // --- Tipos ---
  import type {
    SchemaMetadata,
    DomainCard,
    AISchemaNode,
    AISchemaResponse,
  } from '$lib/types';

  // --- Estado Interno del Componente ---
  let schemas: SchemaMetadata[] = [];
  let currentView: 'main' | 'list-schemas' | 'ai-actions' = 'main';
  let showPasswordModal = false;
  let passwordInput = '';
  let showAiHelper = false;
  let helperConfig = {
    title: '',
    prompt: '',
    validationSchema: z.any() as z.ZodSchema,
    onApply: (data: any) => {},
  };

  // --- Zod Schemas ---
  const FlashcardResponseSchema = z.array(
    z.object({ q: z.string().min(1), a: z.string().min(1) })
  );
  const AISchemaNodeSchema: z.ZodType<AISchemaNode> = z.lazy(() =>
    z.object({
      content: z.string().min(1),
      children: z.array(AISchemaNodeSchema).optional(),
    })
  );
  const ExpansionResponseSchema = z.array(AISchemaNodeSchema);
  const CreateSchemaResponseSchema = z.object({
    title: z.string().min(1),
    nodes: z.array(AISchemaNodeSchema),
  });

  // --- Listas de Acciones ---
  $: mainActions = [
    {
      id: 'new-schema',
      label: 'Nuevo Esquema',
      icon: 'plus' as const,
      isEnabled: true,
    },
    {
      id: 'switch-schema',
      label: 'Cambiar de Esquema...',
      icon: 'file-text' as const,
      isEnabled: true,
    },
    {
      id: 'ai-submenu',
      label: 'Asistente de IA...',
      icon: 'sparkles' as const,
      isEnabled: true,
    },
    {
      id: 'start-review',
      label: 'Iniciar Repaso',
      icon: 'zap' as const,
      isEnabled: true,
    },
    {
      id: 'read-aloud',
      label: 'Leer Esquema',
      icon: 'volume-2' as const,
      isEnabled: true,
    },
    {
      id: 'export-vault',
      label: 'Exportar Bóveda',
      icon: 'download-cloud' as const,
      isEnabled: true,
    },
    {
      id: 'import-vault',
      label: 'Importar Bóveda',
      icon: 'upload-cloud' as const,
      isEnabled: true,
    },
  ];
  $: aiActions = [
    {
      id: 'create-schema-from-text',
      label: 'Crear Esquema desde Texto...',
      icon: 'sparkles' as const,
      isEnabled: true,
    },
    {
      id: 'generate-flashcards',
      label: 'Generar Tarjetas de Estudio',
      icon: 'zap' as const,
      isEnabled: $editorStore.selectedNodePos !== null,
    },
    {
      id: 'expand-node',
      label: 'Expandir este nodo',
      icon: 'plus' as const,
      isEnabled: $editorStore.selectedNodePos !== null,
    },
  ];

  // --- Manejadores de Eventos ---
  async function handleAction(actionId: string) {
    switch (actionId) {
      case 'new-schema':
        await documentStore.createNewDocument();
        commandBarStore.close();
        break;
      case 'switch-schema':
        schemas = await directoryService.listSchemas();
        currentView = 'list-schemas';
        break;
      case 'ai-submenu':
        currentView = 'ai-actions';
        break;
      case 'export-vault':
        commandBarStore.close();
        showPasswordModal = true;
        break;
      case 'import-vault':
        commandBarStore.close();
        await backupService.importVault();
        break;
      case 'start-review':
        reviewStore.startReview();
        commandBarStore.close();
        break;
      case 'read-aloud':
        ttsStore.startReading();
        commandBarStore.close();
        break;
    }
  }

  function handleAiAction(actionId: string) {
    commandBarStore.close(); // Cerramos la CommandBar para mostrar el modal de ayuda

    // --- Acción Global: Crear Esquema ---
    if (actionId === 'create-schema-from-text') {
      helperConfig = {
        title: 'Asistente: Crear Esquema desde Texto',
        prompt: Prompts.CREATE_SCHEMA_FROM_TEXT_PROMPT.replace(
          '{{TEXT_INPUT}}',
          'Pega aquí tu texto...'
        ),
        validationSchema: CreateSchemaResponseSchema,
        onApply: (data: AISchemaResponse) => {
          const buildTiptapContent = (nodes: AISchemaNode[]): object[] => {
            return nodes.map((node) => ({
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: node.content }],
                },
                ...(node.children && node.children.length > 0
                  ? [
                      {
                        type: 'bulletList',
                        content: buildTiptapContent(node.children),
                      },
                    ]
                  : []),
              ],
            }));
          };
          const tiptapContent = {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: data.title }],
              },
              { type: 'bulletList', content: buildTiptapContent(data.nodes) },
            ],
          };
          documentStore.createNewDocument(data.title, tiptapContent);
        },
      };
      showAiHelper = true;
      return;
    }

    // --- Acciones Contextuales (requieren un nodo seleccionado) ---
    const editorState = get(editorStore);
    const editor = editorState.instance;
    if (!editor || editorState.selectedNodePos === null) return;

    const currentPos = editorState.selectedNodePos;
    const node = editor.state.doc.nodeAt(currentPos);
    if (!node) return;

    switch (actionId) {
      case 'generate-flashcards':
        helperConfig = {
          title: 'Asistente: Generar Tarjetas',
          prompt: Prompts.GENERATE_FLASHCARDS_PROMPT.replace(
            '{{NODE_TEXT}}',
            node.textContent
          ),
          validationSchema: FlashcardResponseSchema,
          onApply: (data: DomainCard[]) => {
            const existingCards = node.attrs.cards || [];
            editor
              .chain()
              .focus()
              .setNodeSelection(currentPos)
              .setCards([...existingCards, ...data])
              .run();
          },
        };
        showAiHelper = true;
        break;

      case 'expand-node':
        helperConfig = {
          title: 'Asistente: Expandir Nodo',
          prompt: Prompts.EXPAND_NODE_PROMPT.replace(
            '{{NODE_TEXT}}',
            node.textContent
          ),
          validationSchema: ExpansionResponseSchema,
          onApply: (data: AISchemaNode[]) => {
            const buildTiptapContent = (nodes: AISchemaNode[]): object[] => {
              return nodes.map((n) => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: n.content }],
                  },
                  ...(n.children && n.children.length > 0
                    ? [
                        {
                          type: 'bulletList',
                          content: buildTiptapContent(n.children),
                        },
                      ]
                    : []),
                ],
              }));
            };
            const tiptapJSON = {
              type: 'bulletList',
              content: buildTiptapContent(data),
            };
            editor
              .chain()
              .focus()
              .insertContentAt(currentPos + node.nodeSize - 1, tiptapJSON)
              .run();
          },
        };
        showAiHelper = true;
        break;
    }
  }

  async function handlePasswordSubmit() {
    if (!passwordInput) return;
    try {
      await backupService.exportVault(passwordInput);
    } catch (error) {
      console.error('Error al exportar la bóveda:', error);
    } finally {
      showPasswordModal = false;
      passwordInput = '';
    }
  }

  function handleSchemaSelect(schemaId: string) {
    documentStore.loadDocument(schemaId);
    commandBarStore.close();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (showPasswordModal || showAiHelper) return;

    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }
    if (event.key === 'Escape' && $commandBarStore) {
      if (currentView !== 'main') {
        currentView = 'main';
      } else {
        commandBarStore.close();
      }
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeydown));
  onDestroy(() => window.removeEventListener('keydown', handleKeydown));
</script>

<!-- Modales -->
<Modal
  title="Encriptar y Exportar Bóveda"
  show={showPasswordModal}
  onClose={() => (showPasswordModal = false)}
>
  <form on:submit|preventDefault={handlePasswordSubmit}>
    <p>
      Introduce una contraseña segura para encriptar tu archivo de respaldo.
    </p>
    <input
      type="password"
      bind:value={passwordInput}
      placeholder="Contraseña"
      required
    />
    <div class="modal-actions">
      <Button type="submit">Exportar</Button>
    </div>
  </form>
</Modal>

<AIHelperModal
  show={showAiHelper}
  title={helperConfig.title}
  prompt={helperConfig.prompt}
  validationSchema={helperConfig.validationSchema}
  on:apply={(e) => {
    helperConfig.onApply(e.detail);
    showAiHelper = false;
  }}
  on:close={() => (showAiHelper = false)}
/>

<!-- Interfaz Principal -->
{#if $commandBarStore}
  <button
    class="overlay"
    on:click={commandBarStore.close}
    transition:fade={{ duration: 150 }}
    aria-label="Cerrar menú"
  ></button>

  <div class="panel" transition:fly={{ y: 20, duration: 200 }}>
    <!-- Vistas del panel -->
    {#if currentView === 'main'}
      <div
        class="action-list"
        in:fade={{ duration: 100, delay: 100 }}
        out:fade={{ duration: 100 }}
      >
        {#each mainActions as action}
          <button
            class="action-button"
            on:click={() => handleAction(action.id)}
            disabled={!action.isEnabled}
          >
            <Icon name={action.icon} size={18} />
            <span>{action.label}</span>
          </button>
        {/each}
      </div>
    {:else if currentView === 'list-schemas'}
      <div
        class="action-list"
        in:fade={{ duration: 100, delay: 100 }}
        out:fade={{ duration: 100 }}
      >
        {#each schemas as schema}
          <button
            class="action-button"
            on:click={() => handleSchemaSelect(schema.id)}
          >
            <Icon name="file-text" size={18} />
            <span>{schema.title}</span>
          </button>
        {/each}
      </div>
    {:else if currentView === 'ai-actions'}
      <div
        class="action-list"
        in:fade={{ duration: 100, delay: 100 }}
        out:fade={{ duration: 100 }}
      >
        {#each aiActions as action}
          <button
            class="action-button"
            on:click={() => handleAiAction(action.id)}
            disabled={!action.isEnabled}
          >
            <Icon name={action.icon} size={18} />
            <span>{action.label}</span>
          </button>
        {/each}
        <hr class="separator" />
        <button class="action-button" on:click={() => (currentView = 'main')}>
          <Icon name="x" size={18} />
          <span>Volver</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(:root) {
    --panel-bg-light: rgba(255, 255, 255, 0.85);
    --panel-bg-dark: rgba(24, 24, 24, 0.85);
    --panel-border-light: rgba(0, 0, 0, 0.05);
    --panel-border-dark: rgba(255, 255, 255, 0.05);
    --overlay-bg: rgba(0, 0, 0, 0.15);
    --overlay-blur: blur(3px);
    --btn-hover-bg: rgba(0, 0, 0, 0.03);
    --btn-hover-bg-dark: rgba(255, 255, 255, 0.05);
    --scrollbar-thumb: rgba(0, 0, 0, 0.1);
    --scrollbar-thumb-dark: rgba(255, 255, 255, 0.1);
  }

  .overlay {
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg);
    backdrop-filter: var(--overlay-blur);
    z-index: 99;
    border: none;
  }

  .panel {
    position: fixed;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 640px;
    max-height: 70vh;
    padding: 12px 14px;
    box-sizing: border-box;
    background-color: var(--panel-bg-light);
    border: 1px solid var(--panel-border-light);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 16px;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.04),
      0 8px 32px rgba(0, 0, 0, 0.08);
    z-index: 100;
    display: flex;
    flex-direction: column;
  }

  .action-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    gap: 2px;
    padding: 4px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) transparent;
  }

  .action-list::-webkit-scrollbar {
    width: 6px;
  }

  .action-list::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb);
    border-radius: 4px;
  }

  .action-button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.925rem;
    font-weight: 500;
    color: var(--color-text);
    border-radius: 8px;
    text-align: left;
    gap: 10px;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
  }

  .action-button:hover:not(:disabled),
  .action-button:focus-visible {
    /* Usamos focus-visible para accesibilidad con teclado */
    background-color: var(--btn-hover-bg);
    /* El texto del elemento seleccionado se vuelve más audaz */
    font-weight: 600;
  }

  /* El icono dentro del botón obtiene estilos especiales al interactuar */
  .action-button :global(svg) {
    /* Preparamos el icono para la animación */
    transition:
      transform 0.2s ease,
      color 0.2s ease;
  }

  .action-button:hover:not(:disabled) :global(svg),
  .action-button:focus-visible :global(svg) {
    /* El icono cambia al color de acento de la marca */
    color: var(--color-accent);
    /* El icono hace un pequeño "pop" para dar feedback */
    transform: scale(1.1);
  }

  .action-button:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
  }

  .action-button:active:not(:disabled) {
    transform: scale(0.985);
  }

  .action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .modal-actions {
    margin-top: var(--space-md);
    display: flex;
    justify-content: flex-end;
  }

  input[type='password'] {
    box-sizing: border-box;
    width: 100%;
    padding: var(--space-sm);
    margin-top: var(--space-sm);
    border: none;
    border-radius: 12px;
    font-family: var(--font-main);
    font-size: 0.95rem;
    background-color: rgba(0, 0, 0, 0.04);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  }

  input:focus {
    outline: 2px solid var(--color-accent);
  }

  .separator {
    border: none;
    border-top: 1px solid var(--panel-border-light);
    margin: var(--space-xs) 0;
  }

  @media (max-width: 768px) {
    .panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      height: auto;
      max-height: 80vh;
      width: 100%;
      max-width: none;
      border-radius: 20px 20px 0 0;
      border: 1px solid var(--panel-border-light);
      background-color: var(--panel-bg-light);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: var(--space-md);
      padding-bottom: env(safe-area-inset-bottom, var(--space-md));
      transform: none;
      animation: slideUp 0.3s ease-out forwards;
    }
    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
    .action-list {
      gap: 4px;
    }
  }

  @media (prefers-color-scheme: dark) {
    .panel {
      background-color: var(--panel-bg-dark);
      border-color: var(--panel-border-dark);
    }
    .action-button {
      color: rgba(255, 255, 255, 0.95);
    }
    .action-button:hover:not(:disabled) {
      background-color: var(--btn-hover-bg-dark);
    }
    .action-list::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb-dark);
    }
    input[type='password'] {
      background-color: rgba(255, 255, 255, 0.08);
      color: white;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .separator {
      border-top-color: var(--panel-border-dark);
    }
  }
</style>
