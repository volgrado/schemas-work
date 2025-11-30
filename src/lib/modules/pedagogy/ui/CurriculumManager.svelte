<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { curriculumStore } from '../core/curriculumStore.svelte';
  import Button from '$lib/core/ui/Button.svelte';

  interface Props {
    onCreateNew: () => void;
    onResume: () => void;
  }

  let { onCreateNew, onResume }: Props = $props();

  const languages: Record<string, string> = {
    es: 'Spanish',
    jp: 'Japanese',
    fr: 'French',
    de: 'German',
    en: 'English'
  };

  function getLanguageName(code: string) {
    return languages[code] || code.toUpperCase();
  }

  function handleSwitch(id: string) {
    curriculumStore.switch(id);
    onResume();
  }

  function handleDelete(e: Event, id: string) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this protocol?')) {
      curriculumStore.delete(id);
    }
  }
</script>

<div class="curriculum-manager" in:fade>
  <div class="manager-content">
    <header>
      <h1>Language Interface</h1>
      <p class="subtitle">Select a protocol to engage.</p>
    </header>

    <div class="clusters-grid">
      {#each Object.entries(curriculumStore.byLanguage) as [langCode, curriculums]}
        <section class="language-cluster" in:fly={{ y: 20, duration: 500 }}>
          <h2 class="cluster-title">
            <span class="lang-code">{langCode.toUpperCase()}</span>
            <span class="lang-name">{getLanguageName(langCode)}</span>
          </h2>
          
          <div class="cards-list">
            {#each curriculums as curriculum}
              <div 
                class="curriculum-card" 
                class:active={curriculum.id === curriculumStore.activeCurriculumId}
                onclick={() => handleSwitch(curriculum.id)}
                onkeydown={(e) => e.key === 'Enter' && handleSwitch(curriculum.id)}
                role="button"
                tabindex="0"
              >
                <div class="card-header">
                  <div class="header-top">
                    <span class="title">{curriculum.title}</span>
                    {#if curriculum.id === curriculumStore.activeCurriculumId}
                      <span class="active-badge">Active Protocol</span>
                    {/if}
                  </div>
                  <p class="mission-statement">"{curriculum.manifesto.intent}"</p>
                </div>
                
                <div class="card-body">
                  <div class="dossier-section">
                    <span class="section-label">Operational Context</span>
                    <p class="section-value">{curriculum.manifesto.ecosystem || 'General Immersion'}</p>
                  </div>

                  <div class="dossier-grid">
                    <div class="dossier-item">
                      <span class="item-label">Resources</span>
                      <div class="tags">
                        {#each curriculum.manifesto.vessel as resource}
                          <span class="tag">{resource.replace('_', ' ')}</span>
                        {/each}
                      </div>
                    </div>
                    
                    <div class="dossier-item">
                      <span class="item-label">Calibration</span>
                      <span class="value">{curriculum.manifesto.beliefState?.replace('_', ' ') || 'Uncalibrated'}</span>
                    </div>
                  </div>

                  <div class="progress-section">
                    <div class="progress-header">
                      <span class="label">Neural Mastery</span>
                      <span class="value">{curriculum.progress.mastered.length} Nodes</span>
                    </div>
                    <div class="progress-bar">
                      <div class="fill" style="width: {Math.min(100, (curriculum.progress.mastered.length / 50) * 100)}%"></div>
                    </div>
                  </div>
                </div>

                <div class="card-footer">
                  <span class="last-active">Last engaged: {new Date(curriculum.lastActive).toLocaleDateString()}</span>
                  <button class="delete-btn" onclick={(e) => handleDelete(e, curriculum.id)} title="Archive Protocol">
                    <span class="icon">🗑️</span>
                  </button>
                </div>
              </div>
            {/each}
            
            <!-- Add New for this Language (Future Feature) -->
            <!-- <button class="add-card ghost">+ New {getLanguageName(langCode)} Path</button> -->
          </div>
        </section>
      {/each}

      <!-- Create New Global -->
      <section class="action-cluster">
        <button class="create-new-btn" onclick={onCreateNew}>
          <span class="icon">+</span>
          <span class="text">Initialize New Protocol</span>
        </button>
      </section>
    </div>
  </div>
</div>

<style>
  .curriculum-manager {
    position: absolute;
    inset: 0;
    background: var(--color-background-translucent);
    backdrop-filter: blur(20px);
    z-index: 200;
    display: flex;
    justify-content: center;
    padding: 4rem 2rem;
    overflow-y: auto;
  }

  .manager-content {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  header {
    text-align: center;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .clusters-grid {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .language-cluster {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .cluster-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 1.2rem;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .lang-code {
    background: var(--color-accent);
    color: #000;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .cards-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .curriculum-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
  }

  .curriculum-card:hover {
    background: var(--color-surface-hover);
    transform: translateY(-2px);
  }

  .curriculum-card.active {
    border-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.05);
    box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.1);
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .active-badge {
    font-size: 0.7rem;
    background: var(--color-accent);
    color: #000;
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .mission-statement {
    font-size: 0.95rem;
    color: var(--color-text);
    font-style: italic;
    line-height: 1.4;
    opacity: 0.9;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
    flex: 1;
  }

  .section-label, .item-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
    margin-bottom: 0.3rem;
    display: block;
  }

  .section-value {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .dossier-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tag {
    font-size: 0.7rem;
    background: var(--color-surface-hover);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .value {
    font-size: 0.9rem;
    color: var(--color-text);
    text-transform: capitalize;
  }

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--color-surface-hover);
    border-radius: 2px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: 2px;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;
  }

  .last-active {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .delete-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    font-size: 1rem;
  }

  .delete-btn:hover {
    opacity: 1;
  }

  .create-new-btn {
    width: 100%;
    padding: 2rem;
    background: transparent;
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .create-new-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.05);
  }

  .create-new-btn .icon {
    font-size: 1.5rem;
  }
</style>
