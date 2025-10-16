<script lang="ts">
  // --- Svelte Core y UI ---
  import { get } from 'svelte/store';
  import { tick } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toast } from 'svelte-sonner';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';

  // --- Stores y Servicios ---
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as errorService from '$lib/services/core/errorService';
  import type { SchemaMetadata } from '$lib/types';

  // --- Estado Reactivo (Svelte 5 Runes) ---
  let items = $state<SchemaMetadata[]>([]);
  let currentParentId = $state<string | null>(null);
  let breadcrumbs = $state<SchemaMetadata[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isProcessingAction = $state(false);
  let editingItemId = $state<string | null>(null);
  let isCreatingFolder = $state(false);
  let newFolderName = $state('');
  let isCreatingSchema = $state(false);
  let newSchemaName = $state('');
  let draggedItemId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);
  let contextMenu = $state<{
    x: number;
    y: number;
    item: SchemaMetadata;
  } | null>(null);

  // --- ESTADO PARA LA ANIMACIÓN DE ERROR ---
  let inputError = $state(false);

  // --- ✨ MEJORA: ESTADO PARA EL MENÚ DESPLEGABLE "NUEVO" ---
  let showNewMenu = $state<boolean>(false);
  let newButtonElement = $state<HTMLButtonElement | undefined>();

  // Referencias al DOM (la advertencia 'non_reactive_update' es un falso positivo aquí)
  let renameInput: HTMLInputElement;
  let newFolderInput: HTMLInputElement;
  let newSchemaInput: HTMLInputElement;

  // --- Efectos ---
  $effect(() => {
    commandBarStore.setCurrentParentId(currentParentId);
    fetchItemsForParent(currentParentId);
  });

  // --- Lógica de Datos ---
  async function fetchItemsForParent(parentId: string | null) {
    const MIN_LOADING_TIME = 300; // 300ms de tiempo mínimo de carga
    isLoading = true;
    error = null;

    const fetchData = directoryService.listItemsByParentId(parentId);
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_LOADING_TIME)
    );

    try {
      const [fetchedItems] = await Promise.all([fetchData, minDelay]);
      items = fetchedItems.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'schema') return -1;
        if (a.type === 'schema' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });
    } catch (e) {
      error = 'No se pudieron cargar los esquemas.';
      errorService.reportError(e, {
        operation: 'fetchItemsForParent',
        parentId,
      });
      items = [];
    } finally {
      isLoading = false;
    }
  }

  // --- Lógica de Creación ---
  async function startCreatingSchema() {
    if (isProcessingAction) return;
    isCreatingSchema = true;
    await tick();
    newSchemaInput?.focus();
  }

  async function commitNewSchema() {
    const schemaName = newSchemaName.trim();
    if (!schemaName) {
      isCreatingSchema = false;
      newSchemaName = '';
      return;
    }
    if (isProcessingAction) return;

    isProcessingAction = true;
    try {
      // Llamamos a directoryService para crear solo los metadatos.
      await directoryService.createSchema(schemaName, currentParentId);
      toast.success(`Esquema "${schemaName}" creado.`);
      isCreatingSchema = false;
      newSchemaName = '';
      await fetchItemsForParent(currentParentId); // Refresca la lista
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear el esquema.');
      errorService.reportError(e, { operation: 'commitNewSchema', schemaName });

      // LÓGICA DE REINTENTO
      isProcessingAction = false;
      inputError = true;
      await tick();
      newSchemaInput?.focus();
      newSchemaInput?.select();
      setTimeout(() => (inputError = false), 500); // Resetea la animación
    } finally {
      if (isCreatingSchema !== true) {
        // Solo si no estamos reintentando
        isProcessingAction = false;
      }
    }
  }

  async function startCreatingFolder() {
    if (isProcessingAction) return;
    isCreatingFolder = true;
    await tick();
    newFolderInput?.focus();
  }

  async function commitNewFolder() {
    const folderName = newFolderName.trim();
    if (!folderName) {
      isCreatingFolder = false;
      newFolderName = '';
      return;
    }
    if (isProcessingAction) return;

    isProcessingAction = true;
    try {
      await directoryService.createFolder(folderName, currentParentId);
      toast.success(`Carpeta "${folderName}" creada.`);
      isCreatingFolder = false;
      newFolderName = '';
      await fetchItemsForParent(currentParentId);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear la carpeta.');
      errorService.reportError(e, { operation: 'commitNewFolder', folderName });

      // LÓGICA DE REINTENTO
      isProcessingAction = false;
      inputError = true;
      await tick();
      newFolderInput?.focus();
      newFolderInput?.select();
      setTimeout(() => (inputError = false), 500);
    } finally {
      if (isCreatingFolder !== true) {
        isProcessingAction = false;
      }
    }
  }

  // --- Otros Manejadores ---
  function handleItemClick(item: SchemaMetadata) {
    if (isProcessingAction || editingItemId === item.id) return;
    if (item.type === 'folder') {
      breadcrumbs = [...breadcrumbs, item];
      currentParentId = item.id;
    } else {
      documentStore.loadDocument(item.id);
      commandBarStore.close();
    }
  }

  function navigateToBreadcrumb(folderId: string | null, index: number) {
    if (isProcessingAction) return;
    currentParentId = folderId;
    breadcrumbs = breadcrumbs.slice(0, index);
  }

  async function startEditing(item: SchemaMetadata) {
    contextMenu = null;
    if (isProcessingAction) return;
    editingItemId = item.id;
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  async function commitRename(item: SchemaMetadata, newTitle: string) {
    const oldTitle = item.title;
    const trimmedTitle = newTitle.trim();
    editingItemId = null;
    if (!trimmedTitle || trimmedTitle === oldTitle) return;
    isProcessingAction = true;
    const itemIndex = items.findIndex((i) => i.id === item.id);
    if (itemIndex !== -1) items[itemIndex].title = trimmedTitle;
    try {
      await directoryService.updateItemMetadata(item.id, {
        title: trimmedTitle,
      });
      toast.success(`'${oldTitle}' renombrado a '${trimmedTitle}'.`);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo renombrar el ítem.');
      if (itemIndex !== -1) items[itemIndex].title = oldTitle; // Rollback
      errorService.reportError(e, {
        operation: 'commitRename',
        itemId: item.id,
      });
    } finally {
      isProcessingAction = false;
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent, item: SchemaMetadata) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename(item, (event.target as HTMLInputElement).value);
    } else if (event.key === 'Escape') {
      editingItemId = null;
    }
  }

  function handleDeleteItem(item: SchemaMetadata) {
    contextMenu = null;
    if (isProcessingAction) return;
    const itemType = item.type === 'folder' ? 'La carpeta' : 'El esquema';
    toast.warning(`¿Eliminar "${item.title}"?`, {
      description: `${itemType} y todo su contenido se eliminarán permanentemente.`,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          isProcessingAction = true;
          try {
            await directoryService.deleteItem(item.id);
            await fetchItemsForParent(currentParentId);
            toast.success('Ítem eliminado.');
            if (get(documentStore).docId === item.id) {
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
          } catch (e: any) {
            toast.error(e.message || 'No se pudo eliminar el ítem.');
            errorService.reportError(e, {
              operation: 'handleDeleteItem',
              itemId: item.id,
            });
          } finally {
            isProcessingAction = false;
          }
        },
      },
    });
  }

  function handleDragStart(item: SchemaMetadata, event: DragEvent) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    draggedItemId = item.id;
  }

  function handleDragOver(item: SchemaMetadata, event: DragEvent) {
    if (item.id === draggedItemId || item.type !== 'folder') {
      dropTargetId = null;
      return;
    }

    const draggedItem = items.find((i) => i.id === draggedItemId);
    if (draggedItem?.type === 'folder') {
      let parentId: string | null = item.id;
      while (parentId != null) {
        if (parentId === draggedItemId) {
          dropTargetId = null;
          return;
        }
        const parent = items.find((i: SchemaMetadata) => i.id === parentId);
        parentId = parent ? parent.parentId : null;
      }
    }
    event.preventDefault();
    dropTargetId = item.id;
  }

  function handleDragLeave() {
    dropTargetId = null;
  }

  async function handleDrop(targetFolderId: string | null) {
    if (draggedItemId === null || draggedItemId === targetFolderId) {
      resetDragState();
      return;
    }
    const targetItem = items.find((i) => i.id === targetFolderId);
    if (targetFolderId !== null && targetItem?.type !== 'folder') {
      resetDragState();
      return;
    }

    isProcessingAction = true;
    const movedItem = items.find((i) => i.id === draggedItemId);
    items = items.filter((i) => i.id !== draggedItemId); // Optimistic update
    try {
      await directoryService.moveItem(draggedItemId, targetFolderId);
      toast.success(`"${movedItem?.title}" movido.`);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo mover el ítem.');
      await fetchItemsForParent(currentParentId); // Rollback on error
    } finally {
      resetDragState();
      isProcessingAction = false;
    }
  }

  function resetDragState() {
    draggedItemId = null;
    dropTargetId = null;
  }

  function openContextMenu(event: MouseEvent, item: SchemaMetadata) {
    event.preventDefault();
    contextMenu = { x: event.clientX, y: event.clientY, item };
  }
</script>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={() => (contextMenu = null)}
  >
    <button
      onclick={() => {
        if (!contextMenu) return;
        handleItemClick(contextMenu.item);
      }}
    >
      <Icon name="folder" size={16} />
      <span>Abrir</span>
    </button>
    <hr />
    <button
      onclick={() => {
        if (!contextMenu) return;
        startEditing(contextMenu.item);
      }}
    >
      <Icon name="edit-3" size={16} />
      <span>Renombrar</span>
    </button>
    <button
      onclick={() => {
        if (!contextMenu) return;
        handleDeleteItem(contextMenu.item);
      }}
    >
      <Icon name="trash-2" size={16} />
      <span>Eliminar</span>
    </button>
  </ContextMenu>
{/if}

<header
  class="list-header"
  role="group"
  aria-label="Zona para soltar en la raíz"
  ondragover={(e) => e.preventDefault()}
  ondrop={(e) => {
    e.preventDefault();
    handleDrop(null);
  }}
  ondragleave={handleDragLeave}
  class:drop-target={dropTargetId === null && draggedItemId !== null}
>
  <div class="breadcrumbs">
    <button
      onclick={() => navigateToBreadcrumb(null, 0)}
      disabled={isProcessingAction}>Raíz</button
    >
    {#each breadcrumbs as crumb, i (crumb.id)}
      <span>/</span>
      <button
        onclick={() => navigateToBreadcrumb(crumb.id, i + 1)}
        disabled={isProcessingAction}>{crumb.title}</button
      >
    {/each}
  </div>
  <div class="header-actions">
    <Button
      onclick={startCreatingSchema}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="plus" size={14} />
      <span>Nuevo Esquema</span>
    </Button>
    <Button
      onclick={startCreatingFolder}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="folder" size={14} />
      <span>Nueva Carpeta</span>
    </Button>
  </div>
</header>

<div class="action-list list-view" role="list" ondragleave={handleDragLeave}>
  {#if isLoading}
    <div class="state-message" transition:fade>
      <Icon name="loader" size={24} class="spinner" />
      <span>Cargando...</span>
    </div>
  {:else if error}
    <div class="state-message error" transition:fade>{error}</div>
  {:else if items.length === 0 && !isCreatingFolder && !isCreatingSchema}
    <div class="state-message empty-state" transition:fade|local>
      <Icon name="folder" size={32} />
      <h3>Carpeta Vacía</h3>
      <p>Crea un nuevo esquema o carpeta para empezar.</p>
    </div>
  {/if}

  {#if isCreatingSchema}
    <div class="schema-item editing" transition:slide|local>
      <div class="schema-edit-wrapper">
        <Icon name="file-text" size={18} />
        <input
          type="text"
          class="rename-input"
          placeholder="Nombre del esquema..."
          bind:value={newSchemaName}
          bind:this={newSchemaInput}
          onblur={commitNewSchema}
          onkeydown={(e) => {
            if (e.key === 'Enter') commitNewSchema();
            if (e.key === 'Escape') isCreatingSchema = false;
          }}
          disabled={isProcessingAction}
        />
      </div>
    </div>
  {/if}

  {#if isCreatingFolder}
    <div class="schema-item editing" transition:slide|local>
      <div class="schema-edit-wrapper">
        <Icon name="folder" size={18} />
        <input
          type="text"
          class="rename-input"
          placeholder="Nombre de la carpeta..."
          bind:value={newFolderName}
          bind:this={newFolderInput}
          onblur={commitNewFolder}
          onkeydown={(e) => {
            if (e.key === 'Enter') commitNewFolder();
            if (e.key === 'Escape') isCreatingFolder = false;
          }}
          disabled={isProcessingAction}
        />
      </div>
    </div>
  {/if}

  {#each items as item, i (item.id)}
    <div
      role="listitem"
      in:fly|local={{ y: 10, duration: 200, delay: i * 20, easing: quintOut }}
      out:fade|local={{ duration: 100 }}
      draggable="true"
      ondragstart={(e) => handleDragStart(item, e)}
      ondragend={resetDragState}
      ondragover={(e) => handleDragOver(item, e)}
      ondrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleDrop(item.id);
      }}
      class:is-dragging={draggedItemId === item.id}
      oncontextmenu={(e) => openContextMenu(e, item)}
    >
      <div
        class="schema-item"
        class:disabled={isProcessingAction || !!editingItemId}
        class:drop-target={dropTargetId === item.id}
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
              onblur={(e) => commitRename(item, e.currentTarget.value)}
              onkeydown={(e) => handleRenameKeyDown(e, item)}
              onclick={(event) => event.stopPropagation()}
              disabled={isProcessingAction}
              aria-label={`Nuevo nombre para ${item.title}`}
            />
          </div>
        {:else}
          <div
            class="item-main-content"
            role="button"
            tabindex="0"
            onclick={() => handleItemClick(item)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleItemClick(item);
            }}
          >
            <Icon
              name={item.type === 'folder' ? 'folder' : 'file-text'}
              size={18}
            />
            <span>{item.title}</span>
          </div>
          <div class="schema-actions">
            <button
              class="icon-button"
              onclick={(e) => {
                e.stopPropagation();
                startEditing(item);
              }}
              disabled={isProcessingAction}
              aria-label="Renombrar"
            >
              <Icon name="edit-3" size={16} />
            </button>
            <button
              class="icon-button"
              onclick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item);
              }}
              disabled={isProcessingAction}
              aria-label="Eliminar"
            >
              <Icon name="trash-2" size={16} />
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<footer class="panel-footer">
  <hr class="separator" />
  <button
    class="action-button"
    onclick={() => commandBarStore.setView('main')}
    disabled={isProcessingAction}
  >
    <Icon name="x" size={18} />
    <span>Volver al menú principal</span>
  </button>
</footer>

<style>
  /* --- ESTILOS PARA SCROLLBARS --- */
  :global(.panel .action-list.list-view) {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) transparent;
  }
  :global(.panel .action-list.list-view::-webkit-scrollbar) {
    width: 6px;
  }
  :global(.panel .action-list.list-view::-webkit-scrollbar-thumb) {
    background-color: var(--scrollbar-thumb);
    border-radius: 4px;
  }
  @media (prefers-color-scheme: dark) {
    :global(.panel .action-list.list-view) {
      scrollbar-color: var(--scrollbar-thumb-dark) transparent;
    }
    :global(.panel .action-list.list-view::-webkit-scrollbar-thumb) {
      background-color: var(--scrollbar-thumb-dark);
    }
  }

  /* --- CONTENEDORES PRINCIPALES --- */
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
    transition: background-color 0.2s;
  }

  .action-list.list-view {
    position: relative;
    min-height: 250px;
    overflow-y: auto;
  }

  /* --- CABECERA Y BREADCRUMBS --- */
  .header-actions {
    display: flex;
    gap: var(--space-sm);
    flex-shrink: 0;
  }

  :global(.header-actions .btn) {
    gap: 6px;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
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

  .breadcrumbs button:hover:not(:disabled) {
    color: var(--color-text);
    background-color: var(--btn-hover-bg);
  }

  .breadcrumbs span {
    color: var(--color-gray-500);
  }

  /* --- ESTILOS DE ÍTEMS DE LA LISTA --- */
  .schema-item {
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .schema-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .schema-item:not(.disabled):hover,
  .schema-item:has(.item-main-content:focus-visible) {
    background-color: var(--btn-hover-bg);
  }

  .item-main-content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    flex-grow: 1;
    min-width: 0;
    border-radius: 8px;
    cursor: pointer;
    outline: none;
  }

  .item-main-content:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .item-main-content span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* --- ACCIONES HOVER Y EDICIÓN --- */
  .schema-actions {
    display: flex;
    align-items: center;
    padding-right: 12px;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  /* Oculta acciones hover en pantallas táctiles */
  @media (pointer: coarse) {
    .schema-actions {
      display: none;
    }
  }

  .schema-item:not(.disabled):hover .schema-actions,
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

  .icon-button:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }

  .schema-edit-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    gap: 10px;
  }

  .editing {
    background-color: var(--btn-hover-bg);
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

  /* --- MENSAJES DE ESTADO (CARGANDO, VACÍO, ERROR) --- */
  .state-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    color: var(--color-gray-500);
    width: 100%;
    padding: var(--space-xl);
    box-sizing: border-box;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }

  .state-message.empty-state h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .state-message.empty-state p {
    margin: 0;
    font-size: 0.9rem;
    max-width: 200px;
    text-align: center;
  }
  .state-message.error {
    color: var(--color-danger);
  }

  /* --- ESTILOS DE DRAG & DROP --- */
  .is-dragging {
    opacity: 0.5;
  }

  .drop-target {
    background-color: hsl(var(--color-accent-hsl) / 0.15) !important;
    outline: 1px dashed var(--color-accent);
    outline-offset: -1px;
  }

  /* Añadimos una transición para que el feedback visual sea más suave */
  .list-header,
  .schema-item {
    transition:
      background-color 0.2s ease-in-out,
      outline 0.2s ease-in-out;
  }

  /* --- FOOTER Y MODO OSCURO --- */
  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: 4px 0;
  }

  @media (prefers-color-scheme: dark) {
    .list-header,
    .separator {
      border-color: var(--panel-border-dark);
    }
    .breadcrumbs button:hover:not(:disabled) {
      background-color: var(--btn-hover-bg-dark);
    }
    .schema-item:not(.disabled):hover,
    .schema-item:has(.item-main-content:focus-visible) {
      background-color: var(--btn-hover-bg-dark);
    }
    .icon-button:hover:not(:disabled) {
      background-color: var(--btn-hover-bg-dark);
    }
  }

  /* --- ✨ ANIMACIÓN DE ERROR PARA INPUTS --- */
  @keyframes shake {
    10%,
    90% {
      transform: translateX(-1px);
    }
    20%,
    80% {
      transform: translateX(2px);
    }
    30%,
    50%,
    70% {
      transform: translateX(-3px);
    }
    40%,
    60% {
      transform: translateX(3px);
    }
  }

  .rename-input.input-error {
    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    outline: 1px solid var(--color-danger);
  }
</style>
