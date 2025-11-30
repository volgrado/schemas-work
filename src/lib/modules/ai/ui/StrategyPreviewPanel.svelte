<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import TiptapPreview from '$lib/modules/ai/ui/TiptapPreview.svelte';
  import CardPreview from '$lib/modules/ai/ui/CardPreview.svelte';
  import { fade, fly } from 'svelte/transition';

  let {
    draftContent,
    currentAction,
    isManualMode,
    generatedPrompt,
    pastedJson = $bindable(),
    onProcessJson,
    onCopyPrompt
  } = $props<{
    draftContent: any;
    currentAction: string | undefined;
    isManualMode: boolean;
    generatedPrompt: string;
    pastedJson: string;
    onProcessJson: () => void;
    onCopyPrompt: () => void;
  }>();

  let tiptapPreviewInstance = $state<TiptapPreview | null>(null);

  export function getCurrentSelection() {
    return tiptapPreviewInstance?.getCurrentSelection();
  }
</script>

<div class="preview-panel">
  <!-- Background Pattern -->
  <div class="bg-pattern"></div>

  {#if isManualMode}
    <!-- Developer / Manual Mode View -->
    <div class="dev-mode-container" in:fade>
      <div class="dev-card">
        <div class="card-header">
          <Icon name="code" size={16} />
          <span>Developer Console</span>
        </div>
        
        <div class="split-console">
          <!-- Prompt Output -->
          <div class="console-section">
            <div class="section-label">
              <span>Generated Prompt</span>
              <Button onclick={onCopyPrompt} variant="ghost" size="sm">
                <Icon name="copy" size={12} />
                Copy
              </Button>
            </div>
            <textarea readonly value={generatedPrompt} placeholder="Prompt will appear here..."></textarea>
          </div>

          <!-- JSON Input -->
          <div class="console-section">
            <div class="section-label">
              <span>JSON Response</span>
              <Button onclick={onProcessJson} variant="primary" size="sm" disabled={!pastedJson}>
                <Icon name="play" size={12} />
                Process
              </Button>
            </div>
            <textarea 
              bind:value={pastedJson} 
              placeholder="Paste the AI's JSON response here..."
              class="input-area"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Standard Preview Canvas -->
    <div class="canvas-container" in:fade>
      {#if !draftContent}
        <div class="empty-canvas">
          <div class="empty-content">
            <div class="sparkle-icon">
              <Icon name="sparkles" size={32} />
            </div>
            <h3>{i18n.t('ai_workbench.empty_preview.title')}</h3>
            <p>{i18n.t('ai_workbench.empty_preview.description')}</p>
          </div>
        </div>
      {:else}
        <div class="content-paper" in:fly={{ y: 20, duration: 400 }}>
          {#if currentAction?.includes('document') || currentAction?.includes('schema') || currentAction === 'create-lesson-from-docs'}
            <TiptapPreview
              bind:this={tiptapPreviewInstance}
              content={draftContent}
            />
          {:else if currentAction?.includes('cards')}
            <CardPreview cards={draftContent} />
          {:else}
            <pre class="raw-json">{JSON.stringify(draftContent, null, 2)}</pre>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .preview-panel {
    position: relative;
    height: 100%;
    width: 100%;
    background: var(--color-bg-tertiary);
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bg-pattern {
    position: absolute;
    inset: 0;
    opacity: 0.05;
    background-image: radial-gradient(var(--color-text) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }

  /* Canvas */
  .canvas-container {
    position: relative;
    height: 100%;
    width: 100%;
    padding: var(--space-lg);
    overflow-y: auto;
    display: flex;
    justify-content: center;
  }

  .empty-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  .empty-content {
    text-align: center;
    color: var(--color-text-tertiary);
  }

  .sparkle-icon {
    display: inline-flex;
    padding: var(--space-md);
    background: hsla(var(--color-accent-hsl) / 0.1);
    border-radius: 50%;
    color: var(--color-accent);
    margin-bottom: var(--space-md);
    animation: pulse 3s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }

  .content-paper {
    background: var(--color-page-background);
    width: 100%;
    max-width: 800px;
    min-height: 100%;
    padding: var(--space-xl);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-radius: var(--border-radius-sm);
  }

  .raw-json {
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  /* Dev Mode */
  .dev-mode-container {
    padding: var(--space-lg);
    height: 100%;
    overflow-y: auto; /* Allow scrolling if content is tall */
  }

  .dev-card {
    background: #1e1e1e; /* Dark theme for dev console */
    color: #e0e0e0;
    height: 100%;
    border-radius: var(--border-radius-md);
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .card-header {
    background: #2d2d2d;
    padding: var(--space-sm) var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: monospace;
    font-size: 0.9rem;
    border-bottom: 1px solid #3d3d3d;
  }

  .split-console {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .console-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    border-bottom: 1px solid #3d3d3d;
  }

  .console-section:last-child {
    border-bottom: none;
  }

  .section-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .console-section textarea {
    flex-grow: 1;
    background: #1e1e1e;
    border: none;
    color: #a9b7c6;
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    resize: none;
    outline: none;
  }

  .input-area {
    color: #fff;
  }
</style>
