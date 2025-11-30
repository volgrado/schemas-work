<!--
  @component
  ReviewController

  @description
  The central UI controller for the Spaced Repetition System (SRS) review session.
  This component manages the lifecycle of a review session, rendering appropriate
  card interfaces ('basic', 'input', 'sequencing') based on the current card type.

  It orchestrates:
  - Displaying the question/prompt side of a card.
  - Handling user interactions (revealing answers, typing input, reordering lists).
  - Providing immediate feedback for interactive cards.
  - Submitting review quality scores (0-5) to the `reviewStore`.
  - Showing session progress and a summary screen upon completion.
-->
<script lang="ts">
  // --- Svelte Transition & Animation ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Core Utilities & Stores ---
  import { i18n } from '$lib/utils/i18n.svelte';
  // Import reactive state and actions directly from the store module
  import {
    reviewState,
    submitInteractiveAnswer,
    submitReview,
    finishReview,
    jumpToSource,
    showAnswer,
  } from '$lib/modules/study/ui/reviewStore.svelte';
  import { evaluateAnswer } from '$lib/modules/study/domain/reviewService';

  // --- UI Components ---
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  // --- Types & External Libs ---
  import type { SRS } from '$lib/types';
  import deepEqual from 'deep-eql';

  type ReviewQuality = SRS.ReviewQuality;
  type Card = SRS.Card;

  // --- Local Reactive State (Runes) ---
  let userSequence = $state<string[]>([]);
  let draggedItemIndex = $state<number | null>(null);
  let isSubmitting = $state(false);

  // New State for Enhanced Types
  let selectedOptionIndex = $state<number | null>(null); // For Multiple Choice
  let clozeInputs = $state<string[]>([]); // For Cloze
  let matchingPairs = $state<{ left: string; right: string | null }[]>([]); // For Matching
  let draggedRightItem = $state<string | null>(null); // For Matching Drag & Drop

  // --- Derived State ---
  // Access the global store state directly (no $ prefix needed for imported state objects)
  const currentCard = $derived(
    reviewState.cardsToReview[reviewState.currentCardIndex]
  );

  // Calculate session statistics on the fly
  const sessionProgress = $derived({
    new: reviewState.cardsToReview.filter(
      (c: Card) => !c.srs || c.srs.repetitions === 0
    ).length,
    learning: [...reviewState.cardsToReview, ...reviewState.failedQueue].filter(
      (c: Card) => c.srs?.learningStep > 0
    ).length,
    due: reviewState.cardsToReview.filter(
      (c: Card) => c.srs?.repetitions > 0 && c.srs.learningStep === 0
    ).length,
  });

  // --- Effects ---

  // Effect: Reset local UI state when the card changes
  $effect(() => {
    if (currentCard) {
      // Reset common state
      isSubmitting = false;
      selectedOptionIndex = null;
      clozeInputs = [];
      matchingPairs = [];
      draggedRightItem = null;

      // Type-specific initialization
      if (currentCard.type === 'sequencing') {
        userSequence = [...(currentCard.content.items || [])].sort(
          () => Math.random() - 0.5
        );
      } else if (currentCard.type === 'cloze') {
        // Initialize inputs for each cloze
        let clozes = currentCard.content.clozes || [];
        
        // Fallback: If clozes array is missing, extract from text
        if (clozes.length === 0 && currentCard.content.text) {
           const matches = [...currentCard.content.text.matchAll(/\{\{(?:c\d+::)?(.*?)(?:::[^}]*)?\}\}/g)];
           clozes = matches.map(m => m[1]);
           // Patch the content temporarily so the template can use it
           currentCard.content.clozes = clozes;
        }

        clozeInputs = new Array(clozes.length).fill('');
      } else if (currentCard.type === 'matching') {
        // Shuffle the right side for matching
        const rights = (currentCard.content.pairs || []).map((p) => p.right);
        // Initialize pairs with empty right side (or shuffled if we want them pre-filled but wrong)
        // Let's start with empty slots for a drag-and-drop feel
        matchingPairs = (currentCard.content.pairs || []).map((p) => ({
          left: p.left,
          right: null,
        }));
        // Store the available options separately or just use the shuffled list
        // We'll need a separate list of "available right items" to drag from
      }
    }
  });

  // --- Interaction Handlers ---

  /**
   * Validates the order for 'sequencing' type cards.
   */
  function handleCheckSequence() {
    if (!currentCard || currentCard.type !== 'sequencing') return;
    const isCorrect = deepEqual(userSequence, currentCard.content.items);
    submitInteractiveAnswer(isCorrect);
  }

  function handleCheckMultipleChoice() {
    if (
      !currentCard ||
      currentCard.type !== 'multiple_choice' ||
      selectedOptionIndex === null
    )
      return;
    const isCorrect =
      selectedOptionIndex === currentCard.content.correctOptionIndex;
    submitInteractiveAnswer(isCorrect);
  }

  function handleCheckCloze() {
    if (!currentCard || currentCard.type !== 'cloze') return;
    // Check if all inputs match the clozes (case-insensitive for leniency)
    let clozes = currentCard.content.clozes || [];
    if (clozes.length === 0 && currentCard.content.text) {
        const matches = [...currentCard.content.text.matchAll(/\{\{(?:c\d+::)?(.*?)(?:::[^}]*)?\}\}/g)];
        clozes = matches.map(m => m[1]);
    }

    const isCorrect = clozes.every(
      (expected, i) =>
        clozeInputs[i]?.trim().toLowerCase() === expected.toLowerCase()
    );
    submitInteractiveAnswer(isCorrect);
  }

  function handleCheckMatching() {
    if (!currentCard || currentCard.type !== 'matching') return;
    // Check if all pairs are correct
    const isCorrect = (currentCard.content.pairs || []).every((pair) => {
      const userPair = matchingPairs.find((p) => p.left === pair.left);
      return userPair?.right === pair.right;
    });
    submitInteractiveAnswer(isCorrect);
  }

  // --- Drag and Drop Logic (for Sequencing Cards) ---

  function handleDragStart(index: number) {
    draggedItemIndex = index;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop
  }

  function handleDrop(targetIndex: number) {
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      draggedItemIndex = null;
      return;
    }
    const newSequence = [...userSequence];
    const [draggedItem] = newSequence.splice(draggedItemIndex, 1);
    newSequence.splice(targetIndex, 0, draggedItem);
    userSequence = newSequence;
    draggedItemIndex = null;
  }

  // --- Drag and Drop Logic (for Matching Cards) ---

  function handleMatchingDragStart(item: string) {
    draggedRightItem = item;
  }

  function handleMatchingDrop(targetIndex: number) {
    if (!draggedRightItem) return;

    // If the slot is already filled, swap or replace? Let's swap back to pool if needed.
    // Ideally, we just overwrite.
    // We need to find if this item was already placed somewhere else and remove it.
    const existingIndex = matchingPairs.findIndex(
      (p) => p.right === draggedRightItem
    );

    if (existingIndex !== -1) {
      matchingPairs[existingIndex].right = null;
    }

    matchingPairs[targetIndex].right = draggedRightItem;
    draggedRightItem = null;
  }

  function handleReturnToPool() {
    if (!draggedRightItem) return;
    // Remove from any slot it might be in
    const existingIndex = matchingPairs.findIndex(
      (p) => p.right === draggedRightItem
    );
    if (existingIndex !== -1) {
      matchingPairs[existingIndex].right = null;
    }
    draggedRightItem = null;
  }

</script>

<div
  class="review-screen"
  transition:fade={{ duration: 300, easing: quintOut }}
>
  {#if reviewState.isFinished}
    <!-- Session Summary Screen -->
    <div class="completion-screen">
      <h2>{i18n.t('review.congrats_title')}</h2>
      <p>
        {i18n.t('review.session_finished_desc', {
          count: reviewState.sessionCardCount,
        })}
      </p>
      <Button onclick={finishReview} size="lg"
        >{i18n.t('review.finish_button')}</Button
      >
    </div>
  {:else if currentCard}
    <!-- Header Controls (Progress, Exit) -->
    <div class="global-controls">
      <div class="session-progress">
        <span class="new" title={i18n.t('review.progress.new_tooltip')}
          >{sessionProgress.new}</span
        >
        <span
          class="learning"
          title={i18n.t('review.progress.learning_tooltip')}
          >{sessionProgress.learning}</span
        >
        <span class="due" title={i18n.t('review.progress.due_tooltip')}
          >{sessionProgress.due}</span
        >
      </div>
      <Button
        onclick={jumpToSource}
        variant="ghost"
        size="sm"
        aria-label={i18n.t('review.goToSource')}
      >
        <Icon name="file-text" size={16} />
        <span>{i18n.t('review.goToSource')}</span>
      </Button>
      <Button onclick={finishReview} variant="ghost" size="sm">
        {i18n.t('review.finishReview')}
      </Button>
    </div>

    <!-- Main Flashcard Area -->
    <div class="card-panel" in:fly={{ y: 20, duration: 300, easing: quintOut }}>
      <div class="card-content">
        <!-- Type: Basic -->
        {#if currentCard.type === 'basic'}
          <p class="question">{currentCard.content.question}</p>
          {#if reviewState.isAnswerShown}
            <div class="answer" transition:fade>
              <p>{currentCard.content.answer}</p>
            </div>
          {/if}

          <!-- Type: Sequencing -->
        {:else if currentCard.type === 'sequencing'}
          <p class="question">{currentCard.content.prompt}</p>
          <div class="sequence-container" role="list">
            {#each userSequence as item, i (item)}
              <div
                class="sequence-item"
                draggable="true"
                ondragstart={() => handleDragStart(i)}
                ondragover={handleDragOver}
                ondrop={() => handleDrop(i)}
                class:is-dragging={draggedItemIndex === i}
                role="listitem"
              >
                {item}
              </div>
            {/each}
          </div>
          {#if reviewState.isAnswerShown}
            <div
              class:correct={reviewState.lastAnswerCorrect}
              class:incorrect={!reviewState.lastAnswerCorrect}
              class="feedback"
              transition:fade
            >
              {#if reviewState.lastAnswerCorrect}
                {i18n.t('review.correctSequence')}
              {:else}
                <p>{i18n.t('review.correctSequenceIs')}</p>
                <ol>
                  {#each currentCard.content.items as item, i (i)}
                    <li>{item}</li>
                  {/each}
                </ol>
              {/if}
            </div>
          {/if}

          <!-- Type: Multiple Choice -->
        {:else if currentCard.type === 'multiple_choice'}
          <p class="question">{currentCard.content.question}</p>
          <div class="mc-options">
            {#each currentCard.content.options as option, i}
              <button
                class="mc-option"
                class:selected={selectedOptionIndex === i}
                class:correct={reviewState.isAnswerShown &&
                  i === currentCard.content.correctOptionIndex}
                class:wrong={reviewState.isAnswerShown &&
                  selectedOptionIndex === i &&
                  i !== currentCard.content.correctOptionIndex}
                onclick={() => !reviewState.isAnswerShown && (selectedOptionIndex = i)}
                disabled={reviewState.isAnswerShown}
              >
                <span class="option-letter"
                  >{String.fromCharCode(65 + i)}</span
                >
                <span class="option-text">{option}</span>
              </button>
            {/each}
          </div>

          <!-- Type: Cloze -->
        {:else if currentCard.type === 'cloze'}
          <p class="question">{i18n.t('review.fill_blanks_instruction')}</p>
          <div class="cloze-text">
            {#each currentCard.content.text.split(/(\{\{.*?\}\})/) as part, i}
              {#if part.startsWith('{{') && part.endsWith('}}')}
                {@const clozes: string[] = currentCard.content.clozes || []}
                <!-- 
                  Extract the raw content inside braces. 
                  Handle both simple "{{word}}" and Anki-style "{{c1::word}}".
                -->
                {@const rawContent = part.slice(2, -2)}
                {@const cleanContent = rawContent.includes('::') ? rawContent.split('::')[1] : rawContent}
                
                <!-- 
                  Find the index of this cloze answer in the `clozes` array.
                  We match against the clean content.
                -->
                {@const clozeIndex = clozes.findIndex((c: string) => c === cleanContent)}

                {#if clozeIndex !== -1}
                  {@const isAnswerShown = reviewState.isAnswerShown}
                  {@const userAnswer = clozeInputs[clozeIndex] || ''}
                  {@const correctAnswer = currentCard.content.clozes[clozeIndex]}
                  {@const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()}
                  {@const isEmpty = userAnswer.trim() === ''}

                  <input
                    type="text"
                    class="cloze-input"
                    value={isAnswerShown && isEmpty ? correctAnswer : userAnswer}
                    oninput={(e) => clozeInputs[clozeIndex] = e.currentTarget.value}
                    size={Math.max(2, (userAnswer || correctAnswer).length + 1)}
                    disabled={isAnswerShown}
                    class:correct={isAnswerShown && isCorrect}
                    class:incorrect={isAnswerShown && !isCorrect && !isEmpty}
                    class:missed={isAnswerShown && isEmpty}
                  />
                  <!-- Only show external correction if the user typed something wrong. 
                       If they typed nothing, the answer is now inside the box (missed state). -->
                  {#if isAnswerShown && !isCorrect && !isEmpty}
                    <span class="cloze-correction"
                      >{correctAnswer}</span
                    >
                  {/if}
                {:else}
                  <!-- Fallback: If we can't map it to an answer, just show the text (or a blank) -->
                  <span class="cloze-error" title="Could not map cloze">[?]</span>
                {/if}
              {:else}
                <span>{part}</span>
              {/if}
            {/each}
          </div>

          {#if reviewState.isAnswerShown}
            <div class="answer cloze-solution" transition:fade>
               <p class="answer-label">{i18n.t('review.correct_answers')}:</p>
               <div class="cloze-answers-list">
                  {#each currentCard.content.clozes || [] as answer, i}
                     <div class="cloze-answer-item">
                        <span class="cloze-index">{i + 1}.</span>
                        <span class="cloze-value">{answer}</span>
                     </div>
                  {/each}
               </div>
            </div>
          {/if}

          <!-- Type: Matching -->
        {:else if currentCard.type === 'matching'}
          <p class="question">{currentCard.content.prompt}</p>
          <div class="matching-container">
            <div class="pairs-area">
              {#each matchingPairs as pair, i}
                <div class="match-row">
                  <div class="match-item left">{pair.left}</div>
                  <div class="connector">→</div>
                  <!-- Drop Zone -->
                  <div
                    class="match-slot"
                    ondragover={handleDragOver}
                    ondrop={() => handleMatchingDrop(i)}
                    role="button"
                    tabindex="0"
                  >
                    {#if pair.right}
                      <div
                        class="match-item right"
                        draggable="true"
                        ondragstart={() => handleMatchingDragStart(pair.right!)}
                        role="button"
                        tabindex="0"
                      >
                        {pair.right}
                      </div>
                    {:else}
                      <div class="empty-slot-placeholder">
                        {i18n.t('review.drop_here')}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            <!-- Available Items Pool -->
            <div
              class="pool-area"
              ondragover={handleDragOver}
              ondrop={handleReturnToPool}
              role="list"
            >
              <p class="pool-label">{i18n.t('review.available_items')}</p>
              <div class="pool-items">
                {#each currentCard.content.pairs
                  .map((p) => p.right)
                  .filter((item) => !matchingPairs.some((p) => p.right === item)) as item}
                  <div
                    class="match-item pool"
                    draggable="true"
                    ondragstart={() => handleMatchingDragStart(item)}
                    role="listitem"
                  >
                    {item}
                  </div>
                {/each}
              </div>
            </div>
            </div>
            
            {#if reviewState.isAnswerShown}
              <div class="answer matching-solution" transition:fade>
                <p class="answer-label">{i18n.t('review.correct_answers')}:</p>
                <div class="matching-pairs-list">
                  {#each currentCard.content.pairs || [] as pair}
                    <div class="matching-pair-item">
                      <span class="match-item left static">{pair.left}</span>
                      <span class="connector">→</span>
                      <span class="match-item right static">{pair.right}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            {/if}
      </div>

      <!-- Footer Actions (Show Answer / Rate Card) -->
      <div class="card-actions">
        {#if !reviewState.isAnswerShown}
          <!-- Initial State: Check/Show Answer buttons -->
          {#if currentCard.type === 'basic'}
            <Button onclick={showAnswer} size="lg">
              {i18n.t('review.showAnswer')}
            </Button>
          {:else if currentCard.type === 'sequencing'}
            <Button onclick={handleCheckSequence} size="lg">
              {i18n.t('review.check')}
            </Button>
          {:else if currentCard.type === 'multiple_choice'}
            <Button
              onclick={handleCheckMultipleChoice}
              size="lg"
              disabled={selectedOptionIndex === null}
            >
              {i18n.t('review.check')}
            </Button>
          {:else if currentCard.type === 'cloze'}
            <Button onclick={handleCheckCloze} size="lg">
              {i18n.t('review.check')}
            </Button>
          {:else if currentCard.type === 'matching'}
            <Button onclick={handleCheckMatching} size="lg">
              {i18n.t('review.check')}
            </Button>
          {/if}
        {:else}
          <!-- Answer Revealed State: Quality Rating Buttons -->
          <div class="review-buttons">
            <Button
              onclick={() => submitReview(0)}
              size="md"
              variant="secondary"
            >
              {i18n.t('review.again')}
            </Button>
            <Button
              onclick={() => submitReview(3)}
              size="md"
              variant="secondary"
            >
              {i18n.t('review.hard')}
            </Button>
            <Button onclick={() => submitReview(4)} size="md" variant="primary">
              {i18n.t('review.good')}
            </Button>
            <Button onclick={() => submitReview(5)} size="md" variant="primary">
              {i18n.t('review.easy')}
            </Button>
            </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .review-screen {
    position: fixed;
    inset: 0;
    z-index: 100;
    background-color: var(--color-page-background);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }
  .global-controls {
    position: absolute;
    top: var(--space-lg);
    left: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .session-progress {
    display: flex;
    gap: var(--space-sm);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .session-progress .new {
    color: var(--color-blue-500);
  }
  .session-progress .learning {
    color: var(--color-danger);
  }
  .session-progress .due {
    color: var(--color-green-500);
  }

  .card-panel {
    background-color: var(--color-background-raised);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 600px;
    max-height: calc(100vh - 120px); /* Prevent overflow */
    border: 1px solid var(--color-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card-content {
    padding: var(--space-lg);
    flex-grow: 1;
    min-height: 250px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow-y: auto; /* Allow scrolling */
  }
  .question {
    font-size: 1.4rem; /* Increased size */
    font-weight: 700; /* Bolder */
    margin-bottom: var(--space-lg);
    line-height: 1.4;
    color: var(--color-text);
  }
  .answer {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    font-size: 1.1rem;
    color: var(--color-text-secondary);
  }
  .card-actions {
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    padding: var(--space-md) var(--space-lg); /* Increased padding */
    display: flex;
    justify-content: center;
    min-height: 80px; /* Taller footer */
  }
  .review-buttons {
    display: flex;
    gap: var(--space-md); /* More gap */
  }

  .feedback {
    margin-top: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--space-md);
    font-weight: 600;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .feedback.correct {
    background-color: var(--color-success-bg);
    color: var(--color-success-text);
    border-color: var(--color-success-border);
  }
  .feedback.incorrect {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
    border-color: var(--color-danger-border);
  }
  .sequence-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  .sequence-item {
    padding: var(--space-md);
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
    cursor: grab;
    transition:
      background-color 0.2s,
      box-shadow 0.2s,
      transform 0.2s;
    font-weight: 500;
  }
  .sequence-item:active {
    cursor: grabbing;
    transform: scale(1.02);
  }
  .sequence-item.is-dragging {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-accent);
  }
  .completion-screen {
    text-align: center;
  }

  :global(.dark-theme) .card-panel,
  :global(.dark-theme) .answer,
  :global(.dark-theme) .card-actions,
  :global(.dark-theme) .sequence-item {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .card-actions {
    background-color: var(--color-background-dark-raised);
  }
  :global(.dark-theme) .sequence-item {
    background-color: var(--color-background-dark);
  }
  :global(.dark-theme) .review-screen {
    background-color: var(--color-page-background-dark);
  }

  /* --- Styles for Enhanced Card Types --- */

  /* Multiple Choice */
  .mc-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }
  .mc-option {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border: 2px solid var(--color-border); /* Thicker border */
    border-radius: var(--border-radius-lg);
    background: var(--color-background);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .mc-option:hover:not(:disabled) {
    background: var(--color-bg-secondary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .mc-option.selected {
    border-color: var(--color-accent);
    background: hsla(var(--color-accent-hsl) / 0.1);
  }
  .mc-option.correct {
    border-color: var(--color-success-border);
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }
  .mc-option.wrong {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }
  .option-letter {
    font-weight: 800;
    color: var(--color-text-secondary);
    min-width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    border-radius: 50%;
    font-size: 0.9rem;
  }
  .mc-option.selected .option-letter {
    background: var(--color-accent);
    color: white;
  }

  /* Cloze */
  .cloze-text {
    line-height: 1.8;
    font-size: 1.2rem;
  }
  .cloze-input {
    box-sizing: border-box;
    border: 1px solid var(--color-border-input);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    font-size: 0.95em; /* Slightly smaller to fit */
    font-family: inherit;
    color: var(--color-text);
    font-weight: 500;
    text-align: center;
    padding: 4px 8px;
    margin: 0 4px;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
    vertical-align: baseline;
    width: auto; /* Let size attribute control width */
    max-width: 100%; /* Prevent overflow */
  }
  .cloze-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsla(var(--color-accent-hsl) / 0.2);
  }
  .cloze-input.correct {
    background-color: var(--color-success-bg);
    color: var(--color-success-text);
    border-color: var(--color-success-border);
  }
  .cloze-input.incorrect {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
    border-color: var(--color-danger-border);
  }
  .cloze-input.missed {
    background-color: var(--color-warning-bg);
    color: var(--color-warning-text);
    border-color: var(--color-warning-text);
    font-style: italic;
  }
  .cloze-correction {
    color: var(--color-success-text);
    font-weight: 700;
    margin-left: 4px;
  }
  .cloze-solution {
    margin-top: var(--space-lg);
    padding: var(--space-md);
    background-color: var(--color-gray-50);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }
  :global(.dark-theme) .cloze-solution {
    background-color: var(--color-gray-800);
  }
  .answer-label {
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
    font-size: 0.9rem;
  }
  .cloze-answers-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .cloze-answer-item {
    display: flex;
    gap: var(--space-sm);
    align-items: baseline;
    font-size: 1rem;
  }
  .cloze-index {
    color: var(--color-text-tertiary);
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  .cloze-value {
    font-weight: 600;
    color: var(--color-success-text);
  }

  /* Matching */
  .matching-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }
  .pairs-area {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .match-row {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }
  .match-item {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
    font-size: 0.95rem;
    text-align: center;
  }
  .match-item.left {
    background: var(--color-bg-secondary);
    font-weight: 500;
  }
  .match-item.right,
  .match-item.pool {
    cursor: grab;
    background: var(--color-background);
    box-shadow: var(--shadow-sm);
  }
  .match-item.right:active,
  .match-item.pool:active {
    cursor: grabbing;
  }
  .connector {
    text-align: center;
    color: var(--color-text-tertiary);
  }
  .match-slot {
    border: 2px dashed var(--color-border);
    border-radius: var(--border-radius-sm);
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-tertiary);
    transition: border-color 0.2s;
  }
  .match-slot:hover {
    border-color: var(--color-accent);
  }
  .matching-solution {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  .matching-pairs-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .matching-pair-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }
  .match-item.static {
    cursor: default;
    background-color: var(--color-bg-secondary);
    border-color: var(--color-border);
    box-shadow: none;
  }
  .match-item.static.left {
    font-weight: 600;
  }
  .match-item.static.right {
    color: var(--color-success-text);
    border-color: var(--color-success-border);
    background-color: var(--color-success-bg);
  }
  .pool-area {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  .pool-label {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: var(--space-sm);
    color: var(--color-text-secondary);
  }
  .pool-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
</style>
