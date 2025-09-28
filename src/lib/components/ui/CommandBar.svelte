<!-- src/lib/components/ui/CommandBar.svelte (VERSIÓN FINAL SPRINT 3 - CARPETAS) -->
<script lang="ts">
  // --- Svelte Core ---
  import { onMount, onDestroy, tick } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { z } from 'zod';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';

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
  let items: SchemaMetadata[] = [];
  let currentView: 'main' | 'list-schemas' | 'ai-actions' = 'main';

  // Estado para navegación y gestión de ítems
  let currentParentId: string | null = null;
  let breadcrumbs: SchemaMetadata[] = [];
  let editingItemId: string | null = null;
  let renameInput: HTMLInputElement;

  // Estado para Modales
  let showPasswordModal = false;
  let passwordInput = '';
  let passwordModalAction: 'export' | 'import' = 'export';
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
      label: 'Explorar Esquemas...',
      icon: 'folder' as const,
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
        // Creamos el nuevo esquema en la carpeta raíz por defecto
        await documentStore.createNewDocument('Nuevo Esquema', undefined, null);
        commandBarStore.close();
        break;
      case 'switch-schema':
        await openSchemaList();
        break;
      case 'ai-submenu':
        currentView = 'ai-actions';
        break;
      case 'export-vault':
        passwordModalAction = 'export';
        commandBarStore.close();
        showPasswordModal = true;
        break;
      case 'import-vault':
        passwordModalAction = 'import';
        commandBarStore.close();
        showPasswordModal = true;
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
    commandBarStore.close();
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
          documentStore.createNewDocument(
            data.title,
            tiptapContent,
            currentParentId
          );
        },
      };
      showAiHelper = true;
      return;
    }
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
      if (passwordModalAction === 'export') {
        await backupService.exportVault(passwordInput);
        toast.success('Bóveda exportada correctamente.');
      } else {
        await backupService.importVault(passwordInput);
      }
    } catch (error) {
      console.error(
        `Error durante la operación de ${passwordModalAction}:`,
        error
      );
    } finally {
      showPasswordModal = false;
      passwordInput = '';
    }
  }

  // --- Lógica de Navegación y Gestión de Items ---

  async function openSchemaList() {
    currentParentId = null;
    breadcrumbs = [];
    await fetchItemsForCurrentView();
    currentView = 'list-schemas';
  }

  async function fetchItemsForCurrentView() {
    items = await directoryService.listItemsByParentId(currentParentId);
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'schema') return -1;
      if (a.type === 'schema' && b.type === 'folder') return 1;
      return a.title.localeCompare(b.title);
    });
  }

  async function handleItemClick(item: SchemaMetadata) {
    if (editingItemId === item.id) return;

    if (item.type === 'folder') {
      currentParentId = item.id;
      breadcrumbs = [...breadcrumbs, item];
      await fetchItemsForCurrentView();
    } else {
      documentStore.loadDocument(item.id);
      commandBarStore.close();
    }
  }

  async function navigateToBreadcrumb(folderId: string | null, index: number) {
    currentParentId = folderId;
    breadcrumbs = breadcrumbs.slice(0, index);
    await fetchItemsForCurrentView();
  }

  async function handleNewFolder() {
    const folderName = prompt('Nombre de la nueva carpeta:');
    if (folderName?.trim()) {
      await directoryService.createFolder(folderName.trim(), currentParentId);
      await fetchItemsForCurrentView();
      toast.success(`Carpeta "${folderName.trim()}" creada.`);
    }
  }

  async function startEditing(item: SchemaMetadata) {
    editingItemId = item.id;
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  async function commitRename(item: SchemaMetadata, newTitle: string) {
    editingItemId = null;
    const oldTitle = item.title;
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle === '' || trimmedTitle === oldTitle) return;

    item.title = trimmedTitle;
    items = items;

    try {
      await directoryService.updateItemMetadata(item.id, {
        title: trimmedTitle,
      });
      toast.success(`'${oldTitle}' renombrado a '${trimmedTitle}'.`);
      if (item.type === 'schema' && get(documentStore).docId === item.id) {
        documentStore.updateActiveDocumentMetadata({ title: trimmedTitle });
      }
    } catch (error) {
      toast.error('No se pudo renombrar el ítem.');
      item.title = oldTitle;
      items = items;
      console.error(error);
    }
  }

  async function handleRenameKeyDown(
    event: KeyboardEvent,
    item: SchemaMetadata
  ) {
    if (event.key === 'Enter') {
      event.preventDefault();
      await commitRename(item, (event.target as HTMLInputElement).value);
    } else if (event.key === 'Escape') {
      editingItemId = null;
    }
  }

  async function handleDeleteItem(item: SchemaMetadata) {
    const itemType = item.type === 'folder' ? 'La carpeta' : 'El esquema';
    toast.warning(`¿Eliminar "${item.title}"?`, {
      description: `${itemType} y todo su contenido se eliminarán permanentemente.`,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const isDeletingActiveDoc = get(documentStore).docId === item.id;
            await directoryService.deleteItem(item.id);
            await fetchItemsForCurrentView();
            toast.success('Ítem eliminado.');

            if (isDeletingActiveDoc) {
              const allSchemas = (await directoryService.getAllItems()).filter(
                (i) => i.type === 'schema'
              );
              if (allSchemas.length > 0) {
                await documentStore.loadDocument(allSchemas[0].id);
              } else {
                await documentStore.createNewDocument(
                  'Mi Primer Esquema',
                  undefined,
                  null
                );
              }
            }
          } catch (error) {
            toast.error('No se pudo eliminar el ítem.');
            console.error(error);
          }
        },
      },
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (showPasswordModal || showAiHelper) return;
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }
    if (event.key === 'Escape' && $commandBarStore) {
      if (editingItemId) {
        editingItemId = null;
        return;
      }
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
  title={passwordModalAction === 'export'
    ? 'Encriptar Bóveda'
    : 'Importar Bóveda'}
  show={showPasswordModal}
  onClose={() => (showPasswordModal = false)}
>
  <form on:submit|preventDefault={handlePasswordSubmit}>
    <p>
      {passwordModalAction === 'export'
        ? 'Introduce una contraseña segura.'
        : 'Introduce la contraseña del respaldo.'}
    </p>
    <input
      type="password"
      bind:value={passwordInput}
      placeholder="Contraseña"
      required
    />
    <div class="modal-actions">
      <Button type="submit"
        >{passwordModalAction === 'export' ? 'Exportar' : 'Importar'}</Button
      >
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

  <div
    class="panel"
    class:is-list-view={currentView === 'list-schemas'}
    transition:fly={{ y: 20, duration: 200 }}
  >
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
      <header class="list-header">
        <div class="breadcrumbs">
          <button on:click={() => navigateToBreadcrumb(null, 0)}>Raíz</button>
          {#each breadcrumbs as crumb, i (crumb.id)}
            <span>/</span>
            <button on:click={() => navigateToBreadcrumb(crumb.id, i + 1)}
              >{crumb.title}</button
            >
          {/each}
        </div>
        <Button on:click={handleNewFolder} size="sm" variant="secondary">
          <Icon name="plus" size={14} /> Nueva Carpeta
        </Button>
      </header>

      <div class="action-list list-view">
        {#if items.length === 0}
          <div class="empty-state-list">Esta carpeta está vacía.</div>
        {/if}
        {#each items as item (item.id)}
          <div
            class="schema-item"
            on:click={() => handleItemClick(item)}
            on:keydown={(e) => e.key === 'Enter' && handleItemClick(item)}
            role="button"
            tabindex="0"
          >
            {#if editingItemId === item.id}
              <div class="schema-edit-wrapper">
                <Icon
                  name={item.type === 'folder' ? 'folder' : 'file-text'}
                  size={18}
                />
                <input
                  type="text"
                  class="rename-input"
                  value={item.title}
                  bind:this={renameInput}
                  on:blur={(e) => commitRename(item, e.currentTarget.value)}
                  on:keydown={(e) => handleRenameKeyDown(e, item)}
                  on:click|stopPropagation
                />
              </div>
            {:else}
              <div class="item-main-content">
                <Icon
                  name={item.type === 'folder' ? 'folder' : 'file-text'}
                  size={18}
                />
                <span>{item.title}</span>
              </div>
              <div class="schema-actions">
                <button
                  class="icon-button"
                  on:click|stopPropagation={() => startEditing(item)}
                  aria-label="Renombrar"
                >
                  <Icon name="pen-tool" size={16} />
                </button>
                <button
                  class="icon-button"
                  on:click|stopPropagation={() => handleDeleteItem(item)}
                  aria-label="Eliminar"
                >
                  <Icon name="trash-2" size={16} />
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <footer class="panel-footer">
        <hr class="separator" />
        <button class="action-button" on:click={() => (currentView = 'main')}>
          <Icon name="x" size={18} />
          <span>Volver al menú principal</span>
        </button>
      </footer>
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
    padding: 12px 14px;
  }
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .panel.is-list-view {
    display: grid;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    padding: 6px;
  }
  .action-list.list-view {
    overflow-y: auto;
    padding: 0 8px;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) transparent;
  }
  .action-list.list-view::-webkit-scrollbar {
    width: 6px;
  }
  .action-list.list-view::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb);
    border-radius: 4px;
  }
  .panel-footer {
    padding-top: var(--space-xs);
  }
  .panel-footer .separator {
    margin: 0;
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
    background-color: var(--btn-hover-bg);
    font-weight: 600;
  }
  .action-button :global(svg) {
    transition:
      transform 0.2s ease,
      color 0.2s ease;
  }
  .action-button:hover:not(:disabled) :global(svg),
  .action-button:focus-visible :global(svg) {
    color: var(--color-accent);
    transform: scale(1.1);
  }
  .action-button:active:not(:disabled) {
    transform: scale(0.985);
  }
  .action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .schema-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    cursor: pointer;
  }
  .schema-item:hover {
    background-color: var(--btn-hover-bg);
  }
  .item-main-content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    flex-grow: 1;
    min-width: 0; /* Prevents text overflow issues */
  }
  .item-main-content span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .schema-actions {
    display: flex;
    align-items: center;
    padding-right: 12px;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .schema-item:hover .schema-actions {
    opacity: 1;
  }
  .icon-button {
    display: grid;
    place-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    color: var(--color-gray-500);
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .icon-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--color-text);
  }
  .schema-edit-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    gap: 10px;
  }
  .rename-input {
    flex-grow: 1;
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-main);
    font-size: 0.925rem;
    font-weight: 500;
    color: var(--color-text);
    padding: 0;
    margin: 0;
    caret-color: var(--color-accent);
  }
  .empty-state-list {
    text-align: center;
    padding: var(--space-lg);
    color: var(--color-gray-500);
    font-style: italic;
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8px var(--space-sm) 8px;
    border-bottom: 1px solid var(--panel-border-light);
    margin-bottom: var(--space-xs);
  }
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .breadcrumbs button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-gray-500);
    padding: 4px;
    border-radius: 4px;
    transition:
      color 0.2s,
      background-color 0.2s;
  }
  .breadcrumbs button:hover {
    color: var(--color-text);
    background-color: var(--btn-hover-bg);
  }
  .breadcrumbs span {
    color: var(--color-gray-500);
  }
  .modal-actions {
    margin-top: var(--space-md);
    display: flex;
    justify-content: flex-end;
  }
  input[type='password'],
  input[type='text'] {
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
    .action-list.list-view::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb-dark);
    }
    input[type='password'],
    input[type='text'] {
      background-color: rgba(255, 255, 255, 0.08);
      color: white;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .separator {
      border-top-color: var(--panel-border-dark);
    }
    .schema-item:hover {
      background-color: var(--btn-hover-bg-dark);
    }
    .icon-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .rename-input {
      color: white;
    }
    .list-header {
      border-bottom-color: var(--panel-border-dark);
    }
    .breadcrumbs button:hover {
      background-color: var(--btn-hover-bg-dark);
      color: white;
    }
  }
</style>
