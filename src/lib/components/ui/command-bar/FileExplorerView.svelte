<script lang="ts">
  /**
   * FileExplorerView.svelte (Versión de Vanguardia - Svelte 5 Runes)
   *
   * Este componente es el explorador de archivos para la CommandBar. Ha sido refactorizado
   * para usar exclusivamente Svelte 5 Runes ($state, $effect, $derived) para una reactividad
   * más predecible, un código más limpio y un rendimiento óptimo.
   *
   * Principios Implementados:
   * - Reactividad con Runes: Todo el estado local que cambia y afecta a la UI usa `$state`.
   * - Sincronización con Stores: Usa `$derived` para reaccionar a cambios en stores externos.
   * - Lógica de Efectos: `$effect` se usa para ejecutar lógica (como fetching de datos)
   *   cuando el estado relevante cambia.
   * - Robustez Empresarial: Manejo de errores, estados de carga y bloqueo de UI durante
   *   operaciones para prevenir race conditions.
   * - Accesibilidad (A11y): Usa elementos semánticos (<button>) para interacciones.
   * - Sintaxis Moderna: Utiliza la nueva sintaxis de eventos (onclick, onblur, etc.).
   */

  import { get } from 'svelte/store';
  import { tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as errorService from '$lib/services/core/errorService';
  import type { SchemaMetadata } from '$lib/types';

  // --- Estado ---
  const commandBar = commandBarStore;
  const storeState = $derived(get(commandBar));

  let items = $state<SchemaMetadata[]>([]);
  let currentParentId = $state<string | null>(null);
  let breadcrumbs = $state<SchemaMetadata[]>([]);

  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isOperating = $state(false);

  let editingItemId = $state<string | null>(null);
  let isCreatingFolder = $state(false);
  let newFolderName = $state('');

  let renameInput: HTMLInputElement;
  let newFolderInput: HTMLInputElement;

  // --- Lógica Reactiva (Efectos) ---
  $effect(() => {
    if (storeState.currentView === 'list-schemas' && storeState.isOpen) {
      fetchItemsForParent(currentParentId);
    }
  });

  $effect(() => {
    commandBar.setCurrentParentId(currentParentId);
  });

  // --- Lógica de Datos ---
  async function fetchItemsForParent(parentId: string | null) {
    isLoading = true;
    error = null;
    try {
      const fetchedItems = await directoryService.listItemsByParentId(parentId);
      items = fetchedItems.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'schema') return -1;
        if (a.type === 'schema' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });
    } catch (e) {
      error = 'No se pudieron cargar los esquemas. Inténtalo de nuevo.';
      errorService.reportError(e, {
        operation: 'fetchItemsForParent',
        parentId,
      });
      items = [];
    } finally {
      isLoading = false;
    }
  }

  // --- Manejadores de Eventos de UI ---
  function handleItemClick(item: SchemaMetadata) {
    if (isOperating || editingItemId === item.id) return;
    if (item.type === 'folder') {
      currentParentId = item.id;
      breadcrumbs = [...breadcrumbs, item];
    } else {
      documentStore.loadDocument(item.id);
      commandBar.close();
    }
  }

  function navigateToBreadcrumb(folderId: string | null, index: number) {
    if (isOperating) return;
    currentParentId = folderId;
    breadcrumbs = breadcrumbs.slice(0, index);
  }

  async function startCreatingFolder() {
    if (isOperating) return;
    isCreatingFolder = true;
    await tick();
    newFolderInput?.focus();
  }

  async function commitNewFolder() {
    const folderName = newFolderName.trim();
    if (!folderName || isOperating) {
      isCreatingFolder = false;
      newFolderName = '';
      return;
    }

    isOperating = true;
    try {
      await directoryService.createFolder(folderName, currentParentId);
      await fetchItemsForParent(currentParentId);
      toast.success(`Carpeta "${folderName}" creada.`);
    } catch (e) {
      toast.error('No se pudo crear la carpeta.');
      errorService.reportError(e, { operation: 'commitNewFolder', folderName });
    } finally {
      isOperating = false;
      isCreatingFolder = false;
      newFolderName = '';
    }
  }

  async function startEditing(item: SchemaMetadata) {
    if (isOperating) return;
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

    isOperating = true;
    const originalIndex = items.findIndex((i) => i.id === item.id);
    if (originalIndex === -1) {
      isOperating = false;
      return;
    }

    items[originalIndex].title = trimmedTitle;

    try {
      await directoryService.updateItemMetadata(item.id, {
        title: trimmedTitle,
      });
      toast.success(`'${oldTitle}' renombrado a '${trimmedTitle}'.`);
    } catch (e) {
      toast.error('No se pudo renombrar el ítem.');
      items[originalIndex].title = oldTitle;
      errorService.reportError(e, {
        operation: 'commitRename',
        itemId: item.id,
      });
    } finally {
      isOperating = false;
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

  function handleDeleteItem(item: SchemaMetadata) {
    if (isOperating) return;
    const itemType = item.type === 'folder' ? 'La carpeta' : 'El esquema';
    toast.warning(`¿Eliminar "${item.title}"?`, {
      description: `${itemType} y todo su contenido se eliminarán permanentemente.`,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          isOperating = true;
          try {
            const isDeletingActiveDoc = get(documentStore).docId === item.id;
            await directoryService.deleteItem(item.id);
            await fetchItemsForParent(currentParentId);
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
          } catch (e) {
            toast.error('No se pudo eliminar el ítem.');
            errorService.reportError(e, {
              operation: 'handleDeleteItem',
              itemId: item.id,
            });
          } finally {
            isOperating = false;
          }
        },
      },
    });
  }
</script>

<header class="list-header">
  <div class="breadcrumbs">
    <button onclick={() => navigateToBreadcrumb(null, 0)} disabled={isOperating}
      >Raíz</button
    >
    {#each breadcrumbs as crumb, i (crumb.id)}
      <span>/</span>
      <button
        onclick={() => navigateToBreadcrumb(crumb.id, i + 1)}
        disabled={isOperating}>{crumb.title}</button
      >
    {/each}
  </div>
  <Button
    onclick={startCreatingFolder}
    size="sm"
    variant="secondary"
    disabled={isOperating}
  >
    <Icon name="plus" size={14} /> Nueva Carpeta
  </Button>
</header>

<div class="action-list list-view">
  {#if isLoading}
    <div class="empty-state-list">Cargando...</div>
  {:else if error}
    <div class="error-state-list">{error}</div>
  {:else if items.length === 0 && !isCreatingFolder}
    <div class="empty-state-list">Esta carpeta está vacía.</div>
  {/if}

  {#if isCreatingFolder}
    <div class="schema-item editing">
      <div class="schema-edit-wrapper">
        <Icon name="folder-plus" size={18} />
        <input
          type="text"
          class="rename-input"
          placeholder="Nombre de la nueva carpeta..."
          bind:value={newFolderName}
          bind:this={newFolderInput}
          onblur={commitNewFolder}
          onkeydown={(e) => {
            if (e.key === 'Enter') commitNewFolder();
            if (e.key === 'Escape') isCreatingFolder = false;
          }}
          disabled={isOperating}
        />
      </div>
    </div>
  {/if}

  {#each items as item (item.id)}
    <button
      type="button"
      class="schema-item"
      onclick={() => handleItemClick(item)}
      disabled={isOperating || !!editingItemId}
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
            onblur={(e) => commitRename(item, e.currentTarget.value)}
            onkeydown={(e) => handleRenameKeyDown(e, item)}
            onclick={(event) => event.stopPropagation()}
            disabled={isOperating}
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
            onclick={(event) => {
              event.stopPropagation();
              startEditing(item);
            }}
            disabled={isOperating}
            aria-label="Renombrar"><Icon name="pen-tool" size={16} /></button
          >
          <button
            class="icon-button"
            onclick={(event) => {
              event.stopPropagation();
              handleDeleteItem(item);
            }}
            disabled={isOperating}
            aria-label="Eliminar"><Icon name="trash-2" size={16} /></button
          >
        </div>
      {/if}
    </button>
  {/each}
</div>

<footer class="panel-footer">
  <hr class="separator" />
  <button
    class="action-button"
    onclick={() => commandBarStore.setView('main')}
    disabled={isOperating}
  >
    <Icon name="x" size={18} />
    <span>Volver al menú principal</span>
  </button>
</footer>

<style>
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

  .breadcrumbs button:hover:not(:disabled) {
    color: var(--color-text);
    background-color: var(--btn-hover-bg);
  }

  .breadcrumbs span {
    color: var(--color-gray-500);
  }

  .schema-item {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    text-align: left;
    width: 100%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    outline: none;
  }
  .schema-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .schema-item:not(:disabled):focus-visible {
    background-color: var(--btn-hover-bg);
    box-shadow: 0 0 0 2px var(--color-accent);
  }
  .schema-item:not(:disabled):hover {
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

  .schema-item:not(:disabled):hover .schema-actions,
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

  .empty-state-list {
    text-align: center;
    padding: var(--space-lg);
    color: var(--color-gray-500);
    font-style: italic;
  }

  .error-state-list {
    text-align: center;
    padding: var(--space-lg);
    color: var(--color-danger);
  }

  @media (prefers-color-scheme: dark) {
    .list-header {
      border-bottom-color: var(--panel-border-dark);
    }

    .breadcrumbs button,
    .breadcrumbs span,
    .empty-state-list {
      color: var(--color-gray-500);
    }

    .breadcrumbs button:hover:not(:disabled) {
      color: white; /* O tu variable de texto principal en modo oscuro */
      background-color: var(--btn-hover-bg-dark);
    }

    .schema-item:not(:disabled):hover,
    .schema-item:not(:disabled):focus-visible,
    .editing {
      background-color: var(--btn-hover-bg-dark);
    }

    .rename-input {
      color: white; /* O tu variable de texto principal */
    }

    .icon-button {
      color: var(--color-gray-500);
    }

    .icon-button:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
</style>
