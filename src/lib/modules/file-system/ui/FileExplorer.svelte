<script lang="ts">
  import { tick } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/utils/i18n';

  // --- UI Components ---
  import Icon from '@ui/Icon.svelte';
  import Spinner from '@ui/Spinner.svelte';
  import Button from '@ui/Button.svelte';
  import ContextMenu from '@ui/ContextMenu.svelte';
  // Assuming ViewHeader and CommandButton are local to command-bar feature, 
  // but if we move this, we might need to refactor them too or import them.
  // For now, I'll assume they are passed as slots or I need to check where they are.
  // Wait, ViewHeader is in the same folder as FileExplorerView. 
  // I should probably keep FileExplorer as a pure UI component and let the container handle headers?
  // Or I should copy ViewHeader too? 
  // Let's use the existing ViewHeader for now, assuming I can import it.
  // Actually, ViewHeader is specific to CommandBar. 
  // I will replace ViewHeader with a simple header or just keep the structure if I can't find it.
  // Let's assume I need to import ViewHeader from the command-bar feature for now, 
  // OR better, make FileExplorer self-contained.
  // I'll stick to the existing logic but replace directoryService calls.
  
  // Since ViewHeader is in `src/lib/components/features/command-bar/ViewHeader.svelte`,
  // I'll import it from there for now to avoid breaking too much.
  import ViewHeader from '$lib/modules/command-bar/ui/ViewHeader.svelte';

  // --- Stores & Services ---
  import {
    goBack,
    close as closeCommandBar,
    setCurrentParentId,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import {
    documentState,
    load as loadDocument,
    create as createDocument,
  } from '$lib/stores/documentStore.svelte';
  
  import { fileSystemStore } from '../stores/fileSystemStore.svelte';
  import type { FileSystemNode } from '../domain/FileSystemNode';
  import * as errorService from '$lib/core/services/errorService';

  // --- Component State (Svelte 5 Runes) ---
  // We use a derived state or effect to sync with store
  let currentParentId = $state<string | null>(null);
  
  // Derived items from store
  let items = $derived(fileSystemStore.getChildren(currentParentId).sort((a, b) => {
      if (a.type === 'folder' && b.type === 'schema') return -1;
      if (a.type === 'schema' && b.type === 'folder') return 1;
      return a.title.localeCompare(b.title);
  }));

  let breadcrumbs = $state<FileSystemNode[]>([]);
  let isLoading = $state(false); // Store is sync now (localStorage), so no loading state needed really
  let error = $state<string | null>(null);
  let isProcessingAction = $state(false);
  let editingItemId = $state<string | null>(null);
  let itemBeingCreated = $state<'schema' | 'folder' | null>(null);
  let newItemName = $state('');
  let draggedItemId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);
  let contextMenu = $state<{
    x: number;
    y: number;
    item: FileSystemNode;
  } | null>(null);
  let inputError = $state(false);
  let renameInput = $state<HTMLInputElement | null>(null);
  let newItemInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    setCurrentParentId(currentParentId);
    // No need to fetch, store is reactive
  });

  async function startCreatingItem(type: 'schema' | 'folder') {
    if (isProcessingAction) return;
    itemBeingCreated = type;
    await tick();
    newItemInput?.focus();
  }

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
        toast.success($t('file_explorer.toast.folder_created', { name }));
      } else {
        // createDocument still uses the old logic? 
        // Ideally document creation should also go through fileSystemStore for the file part,
        // but documentStore handles the YJS/IndexedDB part.
        // For now, I'll keep using createDocument but I should verify if it uses directoryService internally.
        // If createDocument uses directoryService, I need to refactor documentStore too.
        // Let's assume createDocument is high-level and we might need to update it later.
        // Wait, createDocument calls directoryService.createSchema.
        // I should probably use fileSystemStore.createSchema here and then initialize the doc?
        // Or just let createDocument do its thing for now and refactor documentStore later.
        // BUT, if I replace directoryService, createDocument will break if it imports it.
        // I will have to update documentStore to use fileSystemStore.
        
        await createDocument(name, undefined, currentParentId);
        toast.success($t('file_explorer.toast.schema_created', { name }));
        closeCommandBar();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : $t('file_explorer.toast.create_failed', { type });
      toast.error(errorMessage);
      errorService.reportError(e, { operation: 'commitNewItem', name, type });
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

  function handleItemClick(item: FileSystemNode) {
    if (isProcessingAction || editingItemId === item.id) return;
    if (item.type === 'folder') {
      breadcrumbs = [...breadcrumbs, item];
      currentParentId = item.id;
    } else {
      loadDocument(item.id);
      closeCommandBar();
    }
  }

  function navigateToBreadcrumb(folderId: string | null, index: number) {
    if (isProcessingAction) return;
    currentParentId = folderId;
    breadcrumbs = breadcrumbs.slice(0, index);
  }

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
        $t('file_explorer.toast.renamed', { oldTitle, newTitle: trimmedTitle })
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : $t('file_explorer.toast.rename_failed');
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

  function handleDeleteItem(item: FileSystemNode) {
    contextMenu = null;
    if (isProcessingAction) return;
    const itemType =
      item.type === 'folder'
        ? $t('file_explorer.item_type.folder')
        : $t('file_explorer.item_type.schema');
    toast.warning(
      $t('file_explorer.delete_confirm.title', { title: item.title }),
      {
        description: $t('file_explorer.delete_confirm.description', {
          itemType,
        }),
        action: {
          label: $t('file_explorer.delete_confirm.action'),
          onClick: async () => {
            isProcessingAction = true;
            try {
              await fileSystemStore.deleteItem(item.id);
              toast.success($t('file_explorer.toast.item_deleted'));
              
              if (documentState.docId === item.id) {
                const allSchemas = fileSystemStore.getAll().filter((i) => i.type === 'schema');
                if (allSchemas.length > 0) {
                  await loadDocument(allSchemas[0].id);
                } else {
                  await createDocument(
                    $t('file_explorer.default_schema_name'),
                    undefined,
                    null
                  );
                }
              }
            } catch (e) {
              const errorMessage =
                e instanceof Error
                  ? e.message
                  : $t('file_explorer.toast.delete_failed');
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

  function isDescendant(
    childId: string | null,
    ancestorId: string | null
  ): boolean {
    if (!childId || !ancestorId) return false;
    try {
      const all = fileSystemStore.getAll();
      const map = new Map(all.map((i) => [i.id, i]));
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
    // Synchronous check is fine now
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
    const targetItem = fileSystemStore.getItem(targetFolderId!);
    if (targetFolderId !== null && targetItem?.type !== 'folder') {
      resetDragState();
      return;
    }
    isProcessingAction = true;
    const movedItem = fileSystemStore.getItem(draggedItemId);
    try {
      await fileSystemStore.moveItem(draggedItemId, targetFolderId);
      toast.success(
        $t('file_explorer.toast.item_moved', { title: movedItem?.title ?? '' })
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : $t('file_explorer.toast.move_failed');
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

  function openContextMenu(event: MouseEvent, item: FileSystemNode) {
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
    <button type="button" onclick={() => contextMenu && handleItemClick(contextMenu.item)}>
      <Icon name="folder" size={16} />
      <span>{$t('file_explorer.context_menu.open')}</span>
    </button>
    <hr />
    <button type="button" onclick={() => contextMenu && startEditing(contextMenu.item)}>
      <Icon name="edit-3" size={16} />
      <span>{$t('file_explorer.context_menu.rename')}</span>
    </button>
    <button type="button" onclick={() => contextMenu && handleDeleteItem(contextMenu.item)}>
      <Icon name="trash-2" size={16} />
      <span>{$t('file_explorer.context_menu.delete')}</span>
    </button>
  </ContextMenu>
{/if}

<div class="view-container">
  <ViewHeader title={$t('file_explorer.title')} onBack={goBack}>
    <Button
      onclick={() => startCreatingItem('schema')}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="plus" size={14} />
      <span>{$t('file_explorer.header.new_schema_button')}</span>
    </Button>
    <Button
      onclick={() => startCreatingItem('folder')}
      size="sm"
      variant="secondary"
      disabled={isProcessingAction}
    >
      <Icon name="folder" size={14} />
      <span>{$t('file_explorer.header.new_folder_button')}</span>
    </Button>

  </ViewHeader>

  <div class="content-area">
    <div
      class="breadcrumb-bar"
      role="group"
      aria-label={$t('file_explorer.header.drop_zone_aria_label')}
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
          {$t('file_explorer.header.root_breadcrumb')}
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

    <div class="list-view" role="list" ondragleave={handleDragLeave}>
      {#if isLoading}
        <div class="state-message is-loading" transition:fade>
          <Spinner size="md" /><span
            >{$t('file_explorer.state.loading')}</span
          >
        </div>
      {:else if error}
        <div class="state-message error" transition:fade>{error}</div>
      {:else if items.length === 0 && !itemBeingCreated}
        <div class="state-message empty-state" transition:fade|local>
          <Icon name="folder" size={32} />
          <h3>{$t('file_explorer.state.empty_folder_title')}</h3>
          <p>{$t('file_explorer.state.empty_folder_message')}</p>
        </div>
      {/if}

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
              placeholder={$t('file_explorer.new_item_placeholder', {
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
                  aria-label={$t('file_explorer.rename_input_aria_label', {
                    title: item.title,
                  })}
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
                  aria-label={$t('file_explorer.item_actions.rename')}
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
                  aria-label={$t('file_explorer.item_actions.delete')}
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
