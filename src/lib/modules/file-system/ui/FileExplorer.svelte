<!--
  @component
  FileExplorer

  @description
  A comprehensive, interactive file system browser designed for the Command Bar.

  Core Features:
  - **Navigation:** Browse folders and schemas with breadcrumb support.
  - **CRUD:** Create, Rename, Delete files and folders.
  - **Drag & Drop:** Move items between folders using native HTML5 drag and drop API.
  - **Context Menu:** Right-click actions for power users.
  - **State Management:** Syncs directly with `fileSystemStore` via Svelte 5 Runes.
  - **Keyboard Support:** Full keyboard navigation and shortcuts (Enter to open, Escape to cancel).
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toast } from 'svelte-sonner';
  import { i18n } from '$lib/utils/i18n.svelte';

  // --- UI Components ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import ContextMenu from '$lib/core/ui/ContextMenu.svelte';
  // Imported from parent module for visual consistency
  import ViewHeader from '$lib/modules/command-bar/ui/ViewHeader.svelte';

  // --- Stores & Services ---
  import {
    goBack,
    close as closeCommandBar,
    setCurrentParentId,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { setActiveView } from '$lib/core/ui/uiStore.svelte';
  import { fileSystemStore } from '$lib/modules/file-system/stores/fileSystemStore.svelte';
  import {
    create as createDocument,
    load as loadDocument,
    documentState,
  } from '$lib/modules/editor/ui/documentStore.svelte';
  import { dataService } from '$lib/modules/file-system/infra/dataService';
  import * as errorService from '$lib/core/services/errorService';
  import type { FileSystemNode } from '$lib/modules/file-system/domain/types';

  // --- Component State (Svelte 5 Runes) ---

  /** The ID of the current folder being viewed. Null implies the root directory. */
  let currentParentId = $state<string | null>(null);

  /** Derived list of items in the current folder, sorted by Type (Folder > Schema) then Name. */
  const items = $derived(
    fileSystemStore
      .getChildren(currentParentId)
      .sort((a: FileSystemNode, b: FileSystemNode) => {
        if (a.type === 'folder' && b.type === 'schema') return -1;
        if (a.type === 'schema' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      })
  );

  // --- Local UI State ---
  let breadcrumbs = $state<FileSystemNode[]>([]);
  const isLoading = $state(false);
  const error = $state<string | null>(null);

  // Action States
  let isProcessingAction = $state(false);
  let editingItemId = $state<string | null>(null);
  let itemBeingCreated = $state<'schema' | 'folder' | null>(null);
  let newItemName = $state('');

  // Drag & Drop State
  let draggedItemId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);

  // Context Menu State
  let contextMenu = $state<{
    x: number;
    y: number;
    item: FileSystemNode;
  } | null>(null);

  // DOM Refs & Validation
  let inputError = $state(false);
  let renameInput = $state<HTMLInputElement | null>(null);
  let newItemInput = $state<HTMLInputElement | null>(null);

  // --- Effects ---

  // Sync local navigation state with the global command bar store
  $effect(() => {
    setCurrentParentId(currentParentId);
  });

  // --- Actions ---

  /**
   * Initiates the creation flow for a new item.
   */
  async function startCreatingItem(type: 'schema' | 'folder') {
    if (isProcessingAction) return;
    itemBeingCreated = type;
    await tick();
    newItemInput?.focus();
  }

  /**
   * Finalizes the creation of a new item.
   */
  async function commitNewItem() {
    const name = newItemName.trim();
    const type = itemBeingCreated;
    itemBeingCreated = null;
    newItemName = '';

    if (!name || !type || isProcessingAction) return;

    isProcessingAction = true;
    try {
      if (type === 'folder') {
        await fileSystemStore.createFolder(name, currentParentId);
        toast.success(i18n.t('file_explorer.toast.folder_created', { name }));
      } else {
        // Create and open the document
        await createDocument(name, undefined, currentParentId);
        toast.success(i18n.t('file_explorer.toast.schema_created', { name }));
        setActiveView('editor');
        closeCommandBar();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : i18n.t('file_explorer.toast.create_failed', { type });
      toast.error(errorMessage);
      errorService.reportError(e, { operation: 'commitNewItem', name, type });

      // Restore UI state for retry
      itemBeingCreated = type;
      newItemName = name;
      inputError = true;
      await tick();
      newItemInput?.focus();
      newItemInput?.select();
      setTimeout(() => (inputError = false), 500);
    } finally {
      if (itemBeingCreated === null) isProcessingAction = false;
    }
  }

  /**
   * Handles clicking on a file (open) or folder (navigate).
   */
  function handleItemClick(item: FileSystemNode) {
    if (isProcessingAction || editingItemId === item.id) return;
    if (item.type === 'folder') {
      breadcrumbs = [...breadcrumbs, item];
      currentParentId = item.id;
    } else {
      loadDocument(item.id);
      setActiveView('editor');
      closeCommandBar();
    }
  }

  /**
   * Jumps to a specific point in the breadcrumb trail.
   */
  function navigateToBreadcrumb(folderId: string | null, index: number) {
    if (isProcessingAction) return;
    currentParentId = folderId;
    breadcrumbs = breadcrumbs.slice(0, index);
  }

  // --- Renaming Logic ---

  async function startEditing(item: FileSystemNode) {
    contextMenu = null;
    if (isProcessingAction) return;
    editingItemId = item.id;
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  async function commitRename(item: FileSystemNode, newTitle: string) {
    const oldTitle = item.title;
    const trimmedTitle = newTitle.trim();
    editingItemId = null;

    if (!trimmedTitle || trimmedTitle === oldTitle) return;

    isProcessingAction = true;
    try {
      await fileSystemStore.updateItem(item.id, {
        title: trimmedTitle,
      });
      toast.success(
        i18n.t('file_explorer.toast.renamed', {
          oldTitle,
          newTitle: trimmedTitle,
        })
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : i18n.t('file_explorer.toast.rename_failed');
      toast.error(errorMessage);
      errorService.reportError(e, {
        operation: 'commitRename',
        itemId: item.id,
      });
    } finally {
      isProcessingAction = false;
    }
  }

  function handleRenameKeyDown(e: KeyboardEvent, item: FileSystemNode) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget as HTMLInputElement | null;
      if (target) commitRename(item, target.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingItemId = null;
    }
  }

  // --- Deletion Logic ---

  function handleDeleteItem(item: FileSystemNode) {
    contextMenu = null;
    if (isProcessingAction) return;

    const itemType =
      item.type === 'folder'
        ? i18n.t('file_explorer.item_type.folder')
        : i18n.t('file_explorer.item_type.schema');

    toast.warning(
      i18n.t('file_explorer.delete_confirm.title', { title: item.title }),
      {
        description: i18n.t('file_explorer.delete_confirm.description', {
          itemType,
        }),
        action: {
          label: i18n.t('file_explorer.delete_confirm.action'),
          onClick: async () => {
            isProcessingAction = true;
            try {
              await dataService.deleteNode(item.id);
              toast.success(i18n.t('file_explorer.toast.item_deleted'));

              // If the deleted item was the active document, switch context
              if (documentState.docId === item.id) {
                const allSchemas = fileSystemStore
                  .getAll()
                  .filter((i: FileSystemNode) => i.type === 'schema');
                if (allSchemas.length > 0) {
                  await loadDocument(allSchemas[0].id);
                } else {
                  // Fallback: Create a new blank schema if nothing is left
                  await createDocument(
                    i18n.t('file_explorer.default_schema_name'),
                    undefined,
                    null
                  );
                  setActiveView('editor');
                }
              }
            } catch (e) {
              const errorMessage =
                e instanceof Error
                  ? e.message
                  : i18n.t('file_explorer.toast.delete_failed');
              toast.error(errorMessage);
              errorService.reportError(e, {
                operation: 'handleDeleteItem',
                itemId: item.id,
              });
            } finally {
              isProcessingAction = false;
            }
          },
        },
      }
    );
  }

  // --- Drag & Drop Logic ---

  function isDescendant(
    childId: string | null,
    ancestorId: string | null
  ): boolean {
    if (!childId || !ancestorId) return false;
    try {
      const all = fileSystemStore.getAll();
      const map = new Map(all.map((i: FileSystemNode) => [i.id, i]));
      let current = map.get(childId);
      while (current && current.parentId) {
        if (current.parentId === ancestorId) return true;
        current = map.get(current.parentId);
      }
      return false;
    } catch (e) {
      errorService.reportError(e, {
        operation: 'isDescendant',
        childId,
        ancestorId,
      });
      return true;
    }
  }

  function handleDragStart(item: FileSystemNode, event: DragEvent) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    draggedItemId = item.id;
  }

  function handleDragOver(item: FileSystemNode, event: DragEvent) {
    if (item.id === draggedItemId || item.type !== 'folder') {
      dropTargetId = null;
      return;
    }
    // Prevent dropping a folder into its own child
    if (isDescendant(draggedItemId, item.id)) {
      dropTargetId = null;
      return;
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

    const targetItem = targetFolderId
      ? fileSystemStore.getItem(targetFolderId)
      : null;
    if (targetFolderId !== null && targetItem?.type !== 'folder') {
      resetDragState();
      return;
    }

    isProcessingAction = true;
    const movedItem = fileSystemStore.getItem(draggedItemId);
    try {
      await fileSystemStore.moveItem(draggedItemId, targetFolderId);
      toast.success(
        i18n.t('file_explorer.toast.item_moved', {
          title: movedItem?.title ?? '',
        })
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : i18n.t('file_explorer.toast.move_failed');
      toast.error(errorMessage);
    } finally {
      resetDragState();
      isProcessingAction = false;
    }
  }

  function resetDragState() {
    draggedItemId = null;
    dropTargetId = null;
  }

  // --- Context Menu ---

  function openContextMenu(event: MouseEvent, item: FileSystemNode) {
    event.preventDefault();
    contextMenu = { x: event.clientX, y: event.clientY, item };
  }
</script>

<!-- Right-click Context Menu -->
{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={() => (contextMenu = null)}
  >
    <button
      type="button"
      onclick={() => contextMenu && handleItemClick(contextMenu.item)}
    >
      <Icon name="folder" size={16} />
      <span>{i18n.t('file_explorer.context_menu.open')}</span>
    </button>
    <hr />
    <button
      type="button"
      onclick={() => contextMenu && startEditing(contextMenu.item)}
    >
      <Icon name="edit-3" size={16} />
      <span>{i18n.t('file_explorer.context_menu.rename')}</span>
    </button>
    <button
      type="button"
      onclick={() => contextMenu && handleDeleteItem(contextMenu.item)}
    >
      <Icon name="trash-2" size={16} />
      <span>{i18n.t('file_explorer.context_menu.delete')}</span>
    </button>
  </ContextMenu>
{/if}

<div class="view-container">
  <ViewHeader title={i18n.t('file_explorer.title')} onBack={goBack}>
    <Button
      onclick={() => startCreatingItem('schema')}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="plus" size={14} />
      <span>{i18n.t('file_explorer.header.new_schema_button')}</span>
    </Button>
    <Button
      onclick={() => startCreatingItem('folder')}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="folder" size={14} />
      <span>{i18n.t('file_explorer.header.new_folder_button')}</span>
    </Button>
  </ViewHeader>

  <!-- Main List Area -->
  <div class="content-area">
    <!-- Breadcrumbs & Drop Target -->
    <div
      class="breadcrumb-bar"
      role="group"
      aria-label={i18n.t('file_explorer.header.drop_zone_aria_label')}
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => {
        e.preventDefault();
        handleDrop(currentParentId);
      }}
      ondragleave={handleDragLeave}
      class:drop-target={dropTargetId === currentParentId &&
        draggedItemId !== null}
    >
      <div class="breadcrumbs">
        <button
          onclick={() => navigateToBreadcrumb(null, 0)}
          disabled={isProcessingAction}
        >
          {i18n.t('file_explorer.header.root_breadcrumb')}
        </button>
        {#each breadcrumbs as crumb, i (crumb.id)}
          <span>/</span>
          <button
            onclick={() => navigateToBreadcrumb(crumb.id, i + 1)}
            disabled={isProcessingAction}
          >
            {crumb.title}
          </button>
        {/each}
      </div>
    </div>

    <!-- File List -->
    <div class="list-view" role="list" ondragleave={handleDragLeave}>
      {#if isLoading}
        <div class="state-message is-loading" transition:fade>
          <Spinner size="md" /><span
            >{i18n.t('file_explorer.state.loading')}</span
          >
        </div>
      {:else if error}
        <div class="state-message error" transition:fade>{error}</div>
      {:else if items.length === 0 && !itemBeingCreated}
        <div class="state-message empty-state" transition:fade|local>
          <Icon name="folder" size={32} />
          <h3>{i18n.t('file_explorer.state.empty_folder_title')}</h3>
          <p>{i18n.t('file_explorer.state.empty_folder_message')}</p>
        </div>
      {/if}

      <!-- Inline Creation Input -->
      {#if itemBeingCreated}
        <div class="schema-item editing" transition:slide|local>
          <div class="schema-edit-wrapper">
            <Icon
              name={itemBeingCreated === 'folder' ? 'folder' : 'file-text'}
              size={18}
            />
            <input
              type="text"
              class="rename-input"
              class:input-error={inputError}
              placeholder={i18n.t('file_explorer.new_item_placeholder', {
                type: itemBeingCreated,
              })}
              bind:value={newItemName}
              bind:this={newItemInput}
              onblur={commitNewItem}
              onkeydown={(e) => {
                if (e.key === 'Enter') commitNewItem();
                if (e.key === 'Escape') {
                  itemBeingCreated = null;
                  newItemName = '';
                }
              }}
              disabled={isProcessingAction}
            />
          </div>
        </div>
      {/if}

      <!-- File/Folder Items -->
      {#each items as item, i (item.id)}
        <div
          role="listitem"
          in:fly|local={{
            y: 10,
            duration: 200,
            delay: i * 20,
            easing: quintOut,
          }}
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
            class:drop-target={dropTargetId === item.id}
            class:disabled={isProcessingAction ||
              (!!editingItemId && editingItemId !== item.id)}
          >
            {#if editingItemId === item.id}
              <!-- Inline Rename -->
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
                  aria-label={i18n.t('file_explorer.rename_input_aria_label', {
                    title: item.title,
                  })}
                />
              </div>
            {:else}
              <!-- Standard Display -->
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
              <!-- Hover Actions -->
              <div class="schema-actions">
                <button
                  class="icon-button"
                  onclick={(e) => {
                    e.stopPropagation();
                    startEditing(item);
                  }}
                  disabled={isProcessingAction}
                  aria-label={i18n.t('file_explorer.item_actions.rename')}
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
                  aria-label={i18n.t('file_explorer.item_actions.delete')}
                >
                  <Icon name="trash-2" size={16} />
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Styles remain unchanged */
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
  }

  .content-area {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
    flex-grow: 1;
  }

  .breadcrumb-bar {
    flex-shrink: 0;
    padding: var(--space-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .list-view {
    position: relative;
    min-height: 250px;
    flex-grow: 1;
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
    color: var(--color-text-secondary);
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
    color: var(--color-text-tertiary);
  }

  .schema-item {
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 8px;
    transition:
      background-color 0.2s,
      opacity 0.2s;
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

  .schema-actions {
    display: flex;
    align-items: center;
    padding-right: 12px;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
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
    color: var(--color-text-secondary);
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

  .state-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    color: var(--color-text-secondary);
    width: 100%;
    padding: var(--space-xl);
    box-sizing: border-box;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .is-loading :global(.icon-wrapper) {
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

  .is-dragging {
    opacity: 0.5;
  }
  .drop-target {
    background-color: hsl(var(--color-accent-hsl) / 0.15) !important;
    outline: 1px dashed var(--color-accent);
    outline-offset: -2px;
  }
  .breadcrumb-bar,
  .schema-item {
    transition:
      background-color 0.2s ease-in-out,
      outline 0.2s ease-in-out;
  }

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
    border-radius: 2px;
  }
</style>
