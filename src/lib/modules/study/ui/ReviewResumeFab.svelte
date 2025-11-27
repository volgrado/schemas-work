<!--
  @component
  ReviewResumeFab
  @description
  A floating action button that appears when a review session is active but the UI is hidden
  (e.g., when the user has clicked "Go to Source"). Clicking it resumes the review UI.
-->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Icon from '$lib/core/ui/Icon.svelte';
  import { reviewState, resumeReviewUi } from '$lib/modules/study/ui/reviewStore.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';

  // Derived state to determine visibility
  const isVisible = $derived(
    reviewState.isReviewing && 
    !reviewState.isFinished && 
    !reviewState.isUiVisible
  );
</script>

{#if isVisible}
  <button
    class="resume-fab"
    onclick={resumeReviewUi}
    in:fly={{ y: 20, duration: 300, easing: quintOut }}
    out:fade={{ duration: 200 }}
    aria-label={i18n.t('review.resume_button')}
    title={i18n.t('review.resume_tooltip')}
  >
    <div class="content">
      <Icon name="play" size={20} />
      <span class="label">{i18n.t('review.resume_button')}</span>
    </div>
    {#if reviewState.sessionCardCount > 0}
      <div class="badge">
        {reviewState.sessionCardCount - reviewState.currentCardIndex}
      </div>
    {/if}
  </button>
{/if}

<style>
  .resume-fab {
    position: fixed;
    bottom: var(--space-xl);
    right: var(--space-xl);
    z-index: 1000; /* High z-index to float above everything */
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    background-color: var(--color-accent);
    color: var(--color-on-accent);
    border: none;
    border-radius: 9999px;
    box-shadow: var(--shadow-lg);
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .resume-fab:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
    background-color: var(--color-accent-hover);
  }

  .resume-fab:active {
    transform: translateY(0);
  }

  .content {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .badge {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    margin-left: var(--space-xs);
  }
</style>
