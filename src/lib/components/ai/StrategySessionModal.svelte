<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import { t } from '$lib/utils/i18n';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import Button from '$lib/components/ui/Button.svelte'; // Assuming you have a Button component

  let { show } = $props<{ show: boolean }>();

  let view: 'loading' | 'brief' | 'draft' | 'error' = $state('loading');
  let analysis = $state('');
  let concepts = $state<{ label: string; checked: boolean }[]>([]);
  let draftedCards = $state<{ q: string; a: string }[]>([]);
  let command = $state('');
  let errorMessage = $state('');

  $effect(() => {
    if (show) {
      loadInitialBrief();
    } else {
      view = 'loading';
      concepts = [];
    }
  });

  async function loadInitialBrief() {
    view = 'loading';
    try {
      // This is where you would call the AI to get the initial brief.
      // We are simulating this for now.
      await new Promise((res) => setTimeout(res, 1000));
      analysis = `Analysis complete. I've identified 3 key concepts in this document that could be turned into study cards.`;
      concepts = [
        { label: 'Placeholder Concept A', checked: true },
        { label: 'Placeholder Concept B', checked: true },
        { label: 'Placeholder Concept C', checked: false },
      ];
      view = 'brief';
    } catch (err) {
      errorMessage = (err as Error).message;
      view = 'error';
    }
  }

  function handleDraft() {
    // TODO: Implement the AI call to generate the draft
    console.log(
      'Drafting cards for:',
      concepts.filter((c) => c.checked)
    );
  }

  function handleCommand() {
    // TODO: Implement the AI call to handle the command
    console.log('Executing command:', command);
    command = '';
  }
</script>

<Modal
  {show}
  onClose={commandBarStore.closeStrategySession}
  title={$t('strategy_session.title')}
>
  {#if view === 'loading'}
    <p>{$t('common.loading')}</p>
  {:else if view === 'error'}
    <p>{errorMessage}</p>
  {:else if view === 'brief'}
    <div class="analysis-brief">
      <p>{analysis}</p>
      <h4>{$t('strategy_session.concepts_title')}</h4>
      <ul class="concept-list">
        {#each concepts as concept}
          <li>
            <label>
              <input type="checkbox" bind:checked={concept.checked} />
              {concept.label}
            </label>
          </li>
        {/each}
      </ul>
      <Button on:click={handleDraft}>
        {$t('strategy_session.draft_button', {
          count: concepts.filter((c) => c.checked).length,
        })}
      </Button>
    </div>
  {:else if view === 'draft'}
    <!-- Draft UI will be implemented in the next phase -->
  {/if}

  <div class="command-bar">
    <input
      type="text"
      bind:value={command}
      placeholder={$t('strategy_session.command_placeholder')}
    />
    <Button on:click={handleCommand} disabled={!command} variant="secondary">
      {$t('common.send')}
    </Button>
  </div>
</Modal>

<style>
  .concept-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }
  .concept-list li {
    padding: 0.25rem 0;
  }
  .command-bar {
    display: flex;
    gap: 8px;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }
  .command-bar input {
    flex-grow: 1;
    padding: 8px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
  }
</style>
