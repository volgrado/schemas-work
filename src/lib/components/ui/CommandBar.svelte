<!-- src/lib/components/ui/CommandBar.svelte (VERSIÓN FINAL SPRINT 3 - CARPETAS) -->
<script lang="ts">
  // --- Svelte Core ---
  import { onMount, onDestroy, tick } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { z } from 'zod';

  // --- Componentes de UI ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import AIHelperModal from '$lib/components/ai/AIHelperModal.svelte';
  import ErrorDiagnosticModal from '$lib/components/ui/ErrorDiagnosticModal.svelte';

  // --- Lógica de la Aplicación (Refactorizada) ---
  import {
    commandBarStore,
    type AiHelperAction,
  } from '$lib/stores/commandBarStore';
  import * as commandService from '$lib/services/features/commandService';

  // --- Dependencias que siguen siendo necesarias para la UI o Modales ---
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as backupService from '$lib/services/features/backupService';
  import * as Prompts from '$lib/services/ai/prompts';
  import type {
    SchemaMetadata,
    AISchemaNode,
    AISchemaResponse,
    DomainCard,
  } from '$lib/types';

  // Usamos el store para controlar toda la visibilidad y el estado.
  const state = commandBarStore;

  // --- Estado local específico para la UI de la vista 'list-schemas' ---
  let items: SchemaMetadata[] = [];
  let currentParentId: string | null = null;
  let breadcrumbs: SchemaMetadata[] = [];
  let editingItemId: string | null = null;
  let renameInput: HTMLInputElement;

  // --- Estado local para los datos de los modales ---
  let passwordInput = '';
  let helperConfig = {
    title: '',
    prompt: '',
    validationSchema: z.any() as z.ZodSchema,
    onApply: (data: any) => {},
  };

  // --- Zod Schemas para la validación en AIHelperModal ---
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

  // --- Efectos Reactivos para Cargar Datos o Configurar Modales ---
  $: {
    if (
      $state.isOpen &&
      $state.currentView === 'list-schemas' &&
      items.length === 0
    ) {
      fetchItemsForCurrentView(); // Carga inicial al cambiar a la vista de lista
    }
    if ($state.isAiHelperOpen && $state.aiHelperAction) {
      configureAiHelper($state.aiHelperAction);
    }
  }

  // --- Manejadores de Eventos de Modales ---
  async function handlePasswordSubmit() {
    if (!passwordInput) return;
    try {
      if ($state.passwordModalAction === 'export') {
        await backupService.exportVault(passwordInput);
        toast.success('Bóveda exportada correctamente.');
      } else {
        await backupService.importVault(passwordInput);
      }
    } catch (error) {
      console.error(
        `Error durante la operación de ${$state.passwordModalAction}:`,
        error
      );
      toast.error('La operación ha fallado.', {
        description: 'Revisa la consola para más detalles.',
      });
    } finally {
      commandBarStore.closePasswordModal();
      passwordInput = '';
    }
  }

  function configureAiHelper(actionId: AiHelperAction) {
    const editorState = get(editorStore);
    const editor = editorState.instance;
    const currentPos = editorState.selectedNodePos;
    const node =
      editor && currentPos !== null
        ? editor.state.doc.nodeAt(currentPos)
        : null;

    switch (actionId) {
      case 'create-schema-from-text':
        helperConfig = {
          title: 'Asistente: Crear Esquema desde Texto',
          prompt: Prompts.CREATE_SCHEMA_FROM_TEXT_PROMPT.replace(
            '{{TEXT_INPUT}}',
            'Pega aquí tu texto...'
          ),
          validationSchema: CreateSchemaResponseSchema,
          onApply: (data: AISchemaResponse) => {
            const buildTiptapContent = (nodes: AISchemaNode[]): object[] =>
              nodes.map((node) => ({
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
        break;
      case 'generate-flashcards':
        if (!node) return;
        helperConfig = {
          title: 'Asistente: Generar Tarjetas',
          prompt: Prompts.GENERATE_FLASHCARDS_PROMPT.replace(
            '{{NODE_TEXT}}',
            node.textContent
          ),
          validationSchema: FlashcardResponseSchema,
          onApply: (data: DomainCard[]) => {
            if (!editor || currentPos === null) return;
            const existingCards = node.attrs.cards || [];
            editor
              .chain()
              .focus()
              .setNodeSelection(currentPos)
              .setCards([...existingCards, ...data])
              .run();
          },
        };
        break;
      case 'expand-node':
        if (!node || !editor || currentPos === null) return;
        helperConfig = {
          title: 'Asistente: Expandir Nodo',
          prompt: Prompts.EXPAND_NODE_PROMPT.replace(
            '{{NODE_TEXT}}',
            node.textContent
          ),
          validationSchema: ExpansionResponseSchema,
          onApply: (data: AISchemaNode[]) => {
            const buildTiptapContent = (nodes: AISchemaNode[]): object[] =>
              nodes.map((n) => ({
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
        break;
    }
  }

  // --- Lógica de la UI para 'list-schemas' (permanece en el componente) ---
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
    items = items; // Forzar reactividad de Svelte

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
      items = items; // Revertir el cambio en la UI
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

  // --- Manejadores Globales de Teclado ---
  function handleKeydown(event: KeyboardEvent) {
    if ($state.isPasswordModalOpen || $state.isAiHelperOpen) return;

    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }

    if (event.key === 'Escape' && $state.isOpen) {
      if (editingItemId) {
        editingItemId = null;
        return;
      }
      if ($state.currentView !== 'main') {
        commandBarStore.setView('main');
        // Al volver al menú principal, reseteamos la lista para que se recargue la próxima vez.
        if ($state.currentView === 'list-schemas') {
          items = [];
        }
      } else {
        commandBarStore.close();
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- Modales: su visibilidad y configuración son controladas por el commandBarStore -->
<ErrorDiagnosticModal
  show={$state.isDiagnosticModalOpen}
  onClose={commandBarStore.closeDiagnosticModal}
/>

<Modal
  title={$state.passwordModalAction === 'export'
    ? 'Encriptar Bóveda'
    : 'Importar Bóveda'}
  show={$state.isPasswordModalOpen}
  onClose={commandBarStore.closePasswordModal}
>
  <form on:submit|preventDefault={handlePasswordSubmit}>
    <p>
      {$state.passwordModalAction === 'export'
        ? 'Introduce una contraseña segura para proteger tu respaldo. Necesitarás esta contraseña para importarlo.'
        : 'Introduce la contraseña con la que se encriptó este respaldo.'}
    </p>
    <input
      type="password"
      bind:value={passwordInput}
      placeholder="Contraseña"
      required
      autocomplete="new-password"
    />
    <div class="modal-actions">
      <Button on:click={commandBarStore.closePasswordModal} variant="secondary"
        >Cancelar</Button
      >
      <Button type="submit">
        {$state.passwordModalAction === 'export'
          ? 'Exportar y Descargar'
          : 'Importar'}
      </Button>
    </div>
  </form>
</Modal>

<AIHelperModal
  show={$state.isAiHelperOpen}
  title={helperConfig.title}
  prompt={helperConfig.prompt}
  validationSchema={helperConfig.validationSchema}
  on:apply={(e) => {
    helperConfig.onApply(e.detail);
    commandBarStore.closeAiHelper();
  }}
  on:close={commandBarStore.closeAiHelper}
/>

<!-- Interfaz Principal de la CommandBar -->
{#if $state.isOpen}
  <button
    class="overlay"
    on:click={commandBarStore.close}
    transition:fade={{ duration: 150 }}
    aria-label="Cerrar menú de comandos"
  ></button>

  <div
    class="panel"
    class:is-list-view={$state.currentView === 'list-schemas'}
    transition:fly={{ y: 20, duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="commandbar-title"
  >
    <!-- Renderizado condicional basado en la vista actual del store -->
    {#if $state.currentView === 'main'}
      <!-- Vista Principal -->
      <div
        class="action-list"
        in:fade={{ duration: 100, delay: 100 }}
        out:fade={{ duration: 100 }}
      >
        <h2 id="commandbar-title" class="visually-hidden">Menú de Comandos</h2>
        {#each commandService.getCommands() as command (command.id)}
          <button
            class="action-button"
            on:click={command.action}
            disabled={command.isEnabled && !command.isEnabled()}
          >
            <Icon name={command.icon} size={18} />
            <span>{command.label}</span>
          </button>
        {/each}
      </div>
    {:else if $state.currentView === 'ai-actions'}
      <!-- Vista de Asistente de IA -->
      <div
        class="action-list"
        in:fade={{ duration: 100, delay: 100 }}
        out:fade={{ duration: 100 }}
      >
        <h2 id="commandbar-title" class="visually-hidden">
          Menú de Asistente de IA
        </h2>
        {#each commandService.getAiCommands() as command (command.id)}
          <button
            class="action-button"
            on:click={command.action}
            disabled={command.isEnabled && !command.isEnabled()}
          >
            <Icon name={command.icon} size={18} />
            <span>{command.label}</span>
          </button>
        {/each}
        <hr class="separator" />
        <button
          class="action-button"
          on:click={() => commandBarStore.setView('main')}
          aria-label="Volver al menú principal"
        >
          <Icon name="x" size={18} />
          <span>Volver</span>
        </button>
      </div>
    {:else if $state.currentView === 'list-schemas'}
      <!-- Vista de Explorador de Archivos -->
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
        {:else}
          {#each items as item (item.id)}
            <div
              class="schema-item"
              on:click={() => handleItemClick(item)}
              on:keydown={(e) => e.key === 'Enter' && handleItemClick(item)}
              role="button"
              tabindex="0"
              aria-label={`Abrir ${item.type === 'folder' ? 'carpeta' : 'esquema'} ${item.title}`}
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
                    aria-label={`Nuevo nombre para ${item.title}`}
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
                    aria-label={`Renombrar ${item.title}`}
                  >
                    <Icon name="pen-tool" size={16} />
                  </button>
                  <button
                    class="icon-button"
                    on:click|stopPropagation={() => handleDeleteItem(item)}
                    aria-label={`Eliminar ${item.title}`}
                  >
                    <Icon name="trash-2" size={16} />
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <footer class="panel-footer">
        <hr class="separator" />
        <button
          class="action-button"
          on:click={() => commandBarStore.setView('main')}
        >
          <Icon name="x" size={18} />
          <span>Volver al menú principal</span>
        </button>
      </footer>
    {/if}
  </div>
{/if}

<style>
  /* === Variables Locales === */
  :global(:root) {
    --panel-bg-light: rgba(255, 255, 255, 0.85);
    --panel-bg-dark: rgba(28, 28, 30, 0.85);
    --panel-border-light: rgba(0, 0, 0, 0.08);
    --panel-border-dark: rgba(255, 255, 255, 0.12);
    --overlay-bg: rgba(0, 0, 0, 0.1);
    --btn-hover-bg: rgba(0, 0, 0, 0.04);
    --btn-hover-bg-dark: rgba(255, 255, 255, 0.08);
    --scrollbar-thumb: rgba(0, 0, 0, 0.2);
    --scrollbar-thumb-dark: rgba(255, 255, 255, 0.2);
  }

  /* === Overlay de Fondo === */
  .overlay {
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 99;
    border: none;
    cursor: default;
  }

  /* === Panel Principal === */
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
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--space-xs);
  }

  /* === Lista de Acciones/Items (Contenedor del Scroll) === */
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-grow: 1;
    overflow-y: auto;
    min-height: 0;
    padding: var(--space-xs);
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

  /* --- Botón de Acción Principal y otros estilos --- */
  .action-button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    border-radius: 8px;
    text-align: left;
    gap: 12px;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
    outline: none;
  }

  .action-button:hover:not(:disabled),
  .action-button:focus-visible {
    background-color: var(--btn-hover-bg);
  }

  .action-button:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .action-button :global(svg) {
    color: var(--color-gray-500);
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

  /* === Vista de Explorador de Archivos === */
  .list-header,
  .panel-footer {
    flex-shrink: 0;
    padding: var(--space-sm);
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--panel-border-light);
    margin-bottom: var(--space-xs);
    padding-bottom: var(--space-sm);
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

  .schema-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    cursor: pointer;
    outline: none;
  }

  .schema-item:focus-visible {
    background-color: var(--btn-hover-bg);
    box-shadow: 0 0 0 2px var(--color-accent);
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
    min-width: 0;
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

  .schema-item:hover .schema-actions,
  .schema-item:focus-within .schema-actions {
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

  /* --- Footer y Separadores --- */
  .panel-footer {
    padding-top: var(--space-xs);
  }

  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: 4px 0;
  }

  /* --- Estilos para los Modales --- */
  .modal-actions {
    margin-top: var(--space-md);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  input[type='password'],
  input[type='text'] {
    box-sizing: border-box;
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-sm);
    border: 1px solid var(--panel-border-light);
    border-radius: var(--space-sm);
    font-family: var(--font-main);
    font-size: 0.95rem;
    background-color: var(--color-background);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input[type='password']:focus,
  input[type='text']:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent), 0.2);
  }

  /* === Adaptación a Móvil === */
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
  }

  /* === Tema Oscuro === */
  @media (prefers-color-scheme: dark) {
    .action-list {
      scrollbar-color: var(--scrollbar-thumb-dark) transparent;
    }
    .action-list::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb-dark);
    }
    .panel {
      background-color: var(--panel-bg-dark);
      border-color: var(--panel-border-dark);
    }
    .action-button,
    .rename-input {
      color: rgba(255, 255, 255, 0.95);
    }
    .action-button:hover:not(:disabled),
    .action-button:focus-visible,
    .schema-item:hover,
    .schema-item:focus-visible,
    .breadcrumbs button:hover {
      background-color: var(--btn-hover-bg-dark);
    }
    .list-header,
    .separator {
      border-color: var(--panel-border-dark);
    }
    .icon-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
    input[type='password'],
    input[type='text'] {
      background-color: var(--color-gray-100);
      color: white;
      border-color: rgba(255, 255, 255, 0.15);
    }
  }
</style>
