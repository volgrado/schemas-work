<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Toggle from '$lib/core/ui/Toggle.svelte';
  import { SUPPORTED_MODELS } from '$lib/modules/ai/aiModels';
  import type { SRS } from '$lib/types';
  import { fade, slide } from 'svelte/transition';

  let {
    configurationInput = $bindable(),
    selectedFiles = $bindable(),
    selectedModelId = $bindable(),
    cardQuantity = $bindable(),
    selectedCardTypes = $bindable(),
    isManualMode = $bindable(),
    command,
    currentAction,
    onFileSelect
  } = $props<{
    configurationInput: string;
    selectedFiles: File[];
    selectedModelId: string;
    cardQuantity: number;
    selectedCardTypes: SRS.CardType[];
    isManualMode: boolean;
    command: any;
    currentAction: string | undefined;
    onFileSelect: (files: File[]) => void;
  }>();

  let isDragging = $state(false);
  let showAdvanced = $state(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        onFileSelect(files);
      }
    }
  }

  function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      onFileSelect(Array.from(target.files));
    }
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_f: File, i: number) => i !== index);
  }
</script>

<div class="config-panel">
  <!-- Header Section -->
  <div class="panel-header">
    <div class="title-row">
      <Icon name="sliders" size={18} />
      <h3>{i18n.t('ai_workbench.configure.title')}</h3>
    </div>
    
    <div class="model-pill">
      <Icon name="server" size={14} />
      <select bind:value={selectedModelId}>
        {#each SUPPORTED_MODELS as model}
          <option value={model.id}>{model.name}</option>
        {/each}
      </select>
      <span class="select-arrow">
        <Icon name="chevron-down" size={12} />
      </span>
    </div>
  </div>

  <!-- Main Input Area -->
  <div class="input-section">
    <textarea
      bind:value={configurationInput}
      placeholder={i18n.t(command?.placeholder || 'ai_workbench.configure.placeholder')}
      class="main-textarea"
    ></textarea>
  </div>

  <!-- Context / File Upload -->
  <div 
    class="context-section"
    class:dragging={isDragging}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="region"
    aria-label="File upload dropzone"
  >
    <div class="dropzone-content">
      <div class="dropzone-header">
        <Icon name="paperclip" size={16} />
        <span>Context Files (PDF)</span>
      </div>
      
      {#if selectedFiles.length === 0}
        <div class="empty-state">
          <p>Drag & drop PDFs here or</p>
          <label class="browse-btn">
            Browse
            <input type="file" accept=".pdf" multiple onchange={handleFileInput} hidden />
          </label>
        </div>
      {:else}
        <div class="file-list" transition:slide>
          {#each selectedFiles as file, i}
            <div class="file-card" transition:fade>
              <div class="file-icon">
                <Icon name="file-text" size={16} />
              </div>
              <span class="file-name" title={file.name}>{file.name}</span>
              <button class="remove-btn" onclick={() => removeFile(i)}>
                <Icon name="x" size={14} />
              </button>
            </div>
          {/each}
          <label class="add-more-btn">
            <Icon name="plus" size={14} />
            Add more
            <input type="file" accept=".pdf" multiple onchange={handleFileInput} hidden />
          </label>
        </div>
      {/if}
    </div>
  </div>

  <!-- Advanced Settings -->
  {#if currentAction?.includes('cards')}
    <div class="settings-section">
      <button class="settings-toggle" onclick={() => showAdvanced = !showAdvanced}>
        <Icon name={showAdvanced ? 'chevron-down' : 'chevron-right'} size={16} />
        <span>Advanced Settings</span>
      </button>

      {#if showAdvanced}
        <div class="settings-content" transition:slide>
          <div class="setting-item">
            <label for="card-qty">Quantity</label>
            <input type="number" id="card-qty" bind:value={cardQuantity} min="1" max="50" />
          </div>

          <div class="setting-item">
            <span class="label">Card Types</span>
            <div class="types-grid">
              {#each ['basic', 'multiple_choice', 'cloze', 'matching', 'sequencing'] as type}
                <label class="type-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedCardTypes.includes(type as any)}
                    onchange={(e) => {
                      if (e.currentTarget.checked) {
                        selectedCardTypes = [...selectedCardTypes, type as any];
                      } else {
                        selectedCardTypes = selectedCardTypes.filter((t: any) => t !== type);
                      }
                    }}
                  />
                  <span>{type.replace('_', ' ')}</span>
                </label>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Footer / Manual Mode -->
  <div class="panel-footer">
    <div class="manual-mode-switch">
      <Toggle
        bind:checked={isManualMode}
        labelText="Dev Mode"
        id="dev-mode-toggle"
      />
    </div>
  </div>
</div>

<style>
  .config-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    height: 100%;
    padding-right: var(--space-sm);
    overflow-y: auto;
  }

  /* Header */
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-text);
  }

  .title-row h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .model-pill {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--color-bg-secondary);
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    font-size: 0.8rem;
    color: var(--color-text); /* Changed from secondary to primary text for better contrast */
    transition: all 0.2s;
  }

  .model-pill:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .model-pill select {
    appearance: none;
    background: transparent;
    border: none;
    color: inherit;
    font-size: inherit;
    font-weight: 500;
    padding-right: 12px;
    cursor: pointer;
    outline: none;
  }

  /* Ensure dropdown options are readable in dark mode */
  .model-pill select option {
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
  }

  .select-arrow {
    position: absolute;
    right: 8px;
    pointer-events: none;
  }

  /* Input Section */
  .input-section {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .main-textarea {
    flex-grow: 1;
    width: 100%;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    font-family: var(--font-main);
    font-size: 0.95rem;
    line-height: 1.5;
    resize: none;
    transition: all 0.2s;
  }

  .main-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsla(var(--color-accent-hsl) / 0.1);
    background: var(--color-background);
  }

  /* Context Section */
  .context-section {
    background: var(--color-bg-secondary);
    border: 1px dashed var(--color-border);
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    transition: all 0.2s;
  }

  .context-section.dragging {
    border-color: var(--color-accent);
    background: hsla(var(--color-accent-hsl) / 0.05);
    transform: scale(1.01);
  }

  .dropzone-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
  }

  .empty-state {
    text-align: center;
    font-size: 0.85rem;
    color: var(--color-text-tertiary);
    padding: var(--space-sm);
  }

  .browse-btn {
    color: var(--color-accent);
    cursor: pointer;
    font-weight: 500;
    text-decoration: underline;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: var(--color-background);
    padding: 6px 10px;
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--color-border);
    font-size: 0.85rem;
  }

  .file-icon {
    color: var(--color-accent);
    display: flex;
  }

  .file-name {
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    display: flex;
  }

  .remove-btn:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  .add-more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    margin-top: 4px;
    padding: 4px;
    border-radius: var(--border-radius-sm);
  }
  
  .add-more-btn:hover {
    background: var(--color-bg-tertiary);
  }

  /* Settings Section */
  .settings-section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-sm);
  }

  .settings-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
  }

  .settings-content {
    margin-top: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .setting-item label, .setting-item .label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .setting-item input[type="number"] {
    padding: 6px;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
    background: var(--color-background);
    color: var(--color-text);
    width: 80px;
  }

  .types-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .type-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text);
  }

  /* Footer */
  .panel-footer {
    margin-top: auto;
    padding-top: var(--space-md);
  }
</style>
