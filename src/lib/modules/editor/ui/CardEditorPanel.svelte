<!--
  @component
  CardEditorPanel

  @description
  An exceptional, production-ready UI for creating and managing review cards.
  This component leverages the `Popup` primitive for its "Add Card" menu, follows
  modern Svelte 5 patterns, and ensures data integrity with correct two-way bindings.
-->
<script lang="ts">
  // --- Svelte Core & UI Libraries ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';

  // --- UI Components ---
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Popup from '$lib/core/ui/Popup.svelte';
  import HelpTooltip from '$lib/core/ui/HelpTooltip.svelte';
  import TagInput from '$lib/core/ui/TagInput.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';

  // --- Stores, Actions, and Utilities ---
  import { i18n } from '$lib/utils/i18n.svelte';
  import { cardEditorState } from '$lib/modules/editor/ui/cardEditorStore.svelte';
  import { CardEditorController } from '$lib/modules/editor/ui/CardEditorController.svelte';
  import { autosize } from '$lib/actions/autosize';

  // Initialize Controller
  const controller = new CardEditorController();

  // Element references for popups/focus management
  let addCardButtonEl = $state<HTMLElement | null>(null);
</script>

{#if cardEditorState.isOpen}
  <!-- Overlay Backdrop: Click to close -->
  <button
    class="overlay"
    onclick={() => controller.closePanel()}
    transition:fade={{ duration: 150 }}
    aria-label="Close card editor"
  ></button>

  <!-- Sliding Panel Container -->
  <div
    class="panel"
    transition:fly={{ y: 100, duration: 250, easing: quintOut }}
    role="dialog"
    aria-labelledby="panel-title"
  >
    <!-- Header: Title, Tooltip, Status, Actions -->
    <header class="header">
      <div class="header-left">
        <div class="header-title">
          <h3 id="panel-title">{i18n.t('card_editor_panel.title')}</h3>
          <HelpTooltip>{i18n.t('card_editor_panel.tooltip')}</HelpTooltip>
        </div>
        {#if cardEditorState.status !== 'idle'}
          <div class="save-status" in:fade={{ duration: 100 }}>
            {#if cardEditorState.status === 'saving'}
              <Spinner size="sm" />
              <span>{i18n.t('card_editor_panel.saving')}</span>
            {:else if cardEditorState.status === 'saved'}
              <Icon name="check-circle" size={14} />
              <span>{i18n.t('card_editor_panel.saved')}</span>
            {/if}
          </div>
        {/if}
      </div>

      <div class="header-actions">
        <!-- Add Card Button + Dropdown Menu -->
        <div class="add-card-container" bind:this={addCardButtonEl}>
          <Button
            variant="secondary"
            size="sm"
            onclick={() => (controller.showAddMenu = !controller.showAddMenu)}
          >
            <Icon name="plus" size={16} />{i18n.t('card_editor_panel.add_card')}
          </Button>
        </div>

        <!-- Add Card Menu Popup -->
        <Popup
          bind:isVisible={controller.showAddMenu}
          referenceEl={addCardButtonEl}
          placement="top-end"
          offsetValue={8}
        >
          <ul class="add-menu" role="menu">
            <li role="presentation">
              <button
                role="menuitem"
                onclick={() => controller.handleAddCard('basic')}
                ><Icon name="pen-tool" size={16} />{i18n.t(
                  'card_editor_panel.add_basic'
                )}</button
              >
            </li>
            <li role="presentation">
              <button
                role="menuitem"
                onclick={() => controller.handleAddCard('input')}
                ><Icon name="edit-3" size={16} />{i18n.t(
                  'card_editor_panel.add_input'
                )}</button
              >
            </li>
            <li role="presentation">
              <button
                role="menuitem"
                onclick={() => controller.handleAddCard('sequencing')}
                ><Icon name="list" size={16} />{i18n.t(
                  'card_editor_panel.add_sequence'
                )}</button
              >
            </li>
            <li role="presentation">
              <button
                role="menuitem"
                onclick={() => controller.handleAddCard('true_false')}
                ><Icon name="check-circle" size={16} />{i18n.t(
                  'card_editor_panel.add_true_false'
                )}</button
              >
            </li>
            <li role="presentation">
              <button
                role="menuitem"
                onclick={() => controller.handleAddCard('multiple_choice')}
                ><Icon name="list" size={16} />{i18n.t(
                  'card_editor_panel.add_multiple_choice'
                )}</button
              >
            </li>
          </ul>
        </Popup>

        <Button
          onclick={() => controller.closePanel()}
          variant="primary"
          size="sm">{i18n.t('card_editor_panel.done')}</Button
        >
      </div>
    </header>

    <!-- Main Editor Content Area -->
    <div class="editor-content">
      {#if cardEditorState.fetchStatus === 'loading'}
        <p>{i18n.t('card_editor_panel.loading')}</p>
      {:else if cardEditorState.fetchStatus === 'error'}
        <p>{i18n.t('card_editor_panel.load_error')}</p>
      {:else if cardEditorState.cards.length > 0}
        <div class="cards-list">
          {#each cardEditorState.cards as card (card.id)}
            <div
              class="card-wrapper"
              animate:flip={{ duration: 300 }}
              use:controller.registerElement={card.id}
            >
              <!-- Card Type Badge -->
              <div
                class="card-type-indicator"
                class:basic={card.type === 'basic'}
                class:input={card.type === 'input'}
                class:sequencing={card.type === 'sequencing'}
              >
                {card.type}
              </div>

              <div class="card-inputs">
                <!-- Basic Card Inputs -->
                {#if card.type === 'basic'}
                  <div class="field">
                    <label for="q-{card.id}"
                      >{i18n.t('card_editor_panel.question_label')}</label
                    >
                    <input
                      id="q-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.question_placeholder'
                      )}
                      bind:value={card.content.question}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="a-{card.id}"
                      >{i18n.t('card_editor_panel.answer_label')}</label
                    >
                    <textarea
                      id="a-{card.id}"
                      placeholder={i18n.t(
                        'card_editor_panel.answer_placeholder'
                      )}
                      bind:value={card.content.answer}
                      oninput={() => controller.handleUpdate(card)}
                      use:autosize
                    ></textarea>
                  </div>

                  <!-- Input Card Inputs -->
                {:else if card.type === 'input'}
                  <div class="field">
                    <label for="p-{card.id}"
                      >{i18n.t('card_editor_panel.prompt_label')}</label
                    >
                    <input
                      id="p-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.prompt_placeholder'
                      )}
                      bind:value={card.content.prompt}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="e-{card.id}"
                      >{i18n.t(
                        'card_editor_panel.expected_answer_label'
                      )}</label
                    >
                    <input
                      id="e-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.expected_answer_placeholder'
                      )}
                      bind:value={card.content.expected}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>

                  <!-- Sequencing Card Inputs -->
                {:else if card.type === 'sequencing'}
                  <div class="field">
                    <label for="s-{card.id}"
                      >{i18n.t('card_editor_panel.instruction_label')}</label
                    >
                    <input
                      id="s-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.instruction_placeholder'
                      )}
                      bind:value={card.content.prompt}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>
                  <div class="sequence-items" role="list">
                    {#each card.content.items as item, itemIndex (itemIndex)}
                      <div
                        class="sequence-item"
                        role="listitem"
                        animate:flip={{ duration: 250 }}
                        draggable="true"
                        ondragstart={(e) =>
                          controller.handleDragStart(itemIndex, e)}
                        ondragover={(e) =>
                          controller.handleDragOver(itemIndex, e)}
                        ondrop={(e) => {
                          e.preventDefault();
                          controller.handleDrop(itemIndex, card);
                        }}
                        ondragend={() => controller.resetDragState()}
                        class:is-dragging={controller.draggedItemIndex ===
                          itemIndex}
                        class:drop-target={controller.dropTargetIndex ===
                          itemIndex &&
                          controller.draggedItemIndex !== itemIndex}
                      >
                        <span
                          class="drag-handle"
                          aria-roledescription="draggable item">::</span
                        >
                        <input
                          type="text"
                          placeholder={i18n.t(
                            'card_editor_panel.sequence_item_placeholder'
                          )}
                          bind:value={card.content.items[itemIndex]}
                          oninput={() => controller.handleUpdate(card)}
                        />
                        <button
                          class="remove-item-button"
                          onclick={() =>
                            controller.removeSequenceItem(card, itemIndex)}
                          ><Icon name="x" size={14} /></button
                        >
                      </div>
                    {/each}
                  </div>
                  <button
                    class="add-item-button"
                    onclick={() => controller.addSequenceItem(card)}
                    ><Icon name="plus" size={14} />{i18n.t(
                      'card_editor_panel.add_item'
                    )}</button
                  >

                  <!-- True/False Card Inputs -->
                {:else if card.type === 'true_false'}
                  <div class="field">
                    <label for="s-{card.id}"
                      >{i18n.t('card_editor_panel.statement_label')}</label
                    >
                    <input
                      id="s-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.statement_placeholder'
                      )}
                      bind:value={card.content.statement}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <span class="field-label"
                      >{i18n.t('card_editor_panel.is_true_label')}</span
                    >
                    <div class="radio-group">
                      <label class="radio-label">
                        <input
                          type="radio"
                          name="tf-{card.id}"
                          value={true}
                          bind:group={card.content.isTrue}
                          onchange={() => controller.handleUpdate(card)}
                        />
                        {i18n.t('card_editor_panel.true')}
                      </label>
                      <label class="radio-label">
                        <input
                          type="radio"
                          name="tf-{card.id}"
                          value={false}
                          bind:group={card.content.isTrue}
                          onchange={() => controller.handleUpdate(card)}
                        />
                        {i18n.t('card_editor_panel.false')}
                      </label>
                    </div>
                  </div>

                  <!-- Multiple Choice Card Inputs -->
                {:else if card.type === 'multiple_choice'}
                  <div class="field">
                    <label for="q-{card.id}"
                      >{i18n.t('card_editor_panel.question_label')}</label
                    >
                    <input
                      id="q-{card.id}"
                      type="text"
                      placeholder={i18n.t(
                        'card_editor_panel.question_placeholder'
                      )}
                      bind:value={card.content.question}
                      oninput={() => controller.handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <span class="field-label"
                      >{i18n.t('card_editor_panel.options_label')}</span
                    >
                    <div class="sequence-items">
                      {#each card.content.options as option, optIndex (optIndex)}
                        <div class="sequence-item">
                          <input
                            type="radio"
                            name="correct-{card.id}"
                            checked={card.content.correctOptionIndex ===
                              optIndex}
                            onchange={() => {
                              card.content.correctOptionIndex = optIndex;
                              controller.handleUpdate(card);
                            }}
                          />
                          <input
                            type="text"
                            placeholder={i18n.t(
                              'card_editor_panel.option_placeholder'
                            )}
                            bind:value={card.content.options[optIndex]}
                            oninput={() => controller.handleUpdate(card)}
                          />
                          <button
                            class="remove-item-button"
                            onclick={() => {
                              card.content.options.splice(optIndex, 1);
                              if (
                                card.content.correctOptionIndex >=
                                card.content.options.length
                              ) {
                                card.content.correctOptionIndex = Math.max(
                                  0,
                                  card.content.options.length - 1
                                );
                              }
                              controller.handleUpdate(card);
                            }}
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      {/each}
                      <button
                        class="add-item-button"
                        onclick={() => {
                          card.content.options.push('');
                          controller.handleUpdate(card);
                        }}
                      >
                        <Icon name="plus" size={14} />
                        {i18n.t('card_editor_panel.add_option')}
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Shared: Tags Input -->
                <div class="field">
                  <label for="tags-{card.id}">Tags</label>
                  <TagInput
                    id="tags-{card.id}"
                    bind:tags={card.tags}
                    oninput={() => controller.handleUpdate(card)}
                  />
                </div>
              </div>

              <!-- Shared: Delete Button -->
              <button
                class="remove-card-button"
                onclick={() => controller.handleRemoveCard(card.id)}
                aria-label="Delete card"
                ><Icon name="trash-2" size={16} /></button
              >
            </div>
          {/each}
        </div>
      {:else}
        <!-- Empty State -->
        <div class="empty-state">
          <Icon name="plus-square" size={40} />
          <h4>{i18n.t('card_editor_panel.empty_title')}</h4>
          <p>{i18n.t('card_editor_panel.empty_message')}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* All styles are unchanged and correct */
  /* All styles are unchanged and correct */
  .overlay {
    all: unset;
    display: block;
    position: fixed;
    inset: 0;
    background: var(--overlay-bg, rgba(0, 0, 0, 0.4));
    z-index: var(--z-overlay);
    cursor: default;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity var(--duration-base) var(--ease-out);
  }
  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-modal);
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .header-left,
  .header-actions,
  .header-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .header-title h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }
  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  .save-status :global(.icon-wrapper) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .add-card-container {
    position: relative;
    display: inline-block;
  }
  .add-menu {
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 4px;
    list-style: none;
    margin: 0;
    min-width: 180px;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
  }
  .add-menu button {
    width: 100%;
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    transition: background-color 0.15s ease;
  }
  .add-menu button:hover {
    background: var(--btn-hover-bg);
  }
  .editor-content {
    padding: var(--space-md);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .card-wrapper {
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    display: flex;
    gap: var(--space-md);
    position: relative;
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }
  .card-wrapper:focus-within {
    border-color: var(--color-accent);
  }
  .card-type-indicator {
    position: absolute;
    top: -1px;
    left: -1px;
    padding: 3px 10px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    border-radius: var(--radius-md) 0 var(--radius-sm) 0;
    color: white;
  }
  .card-type-indicator.basic {
    background-color: var(--color-accent);
  }
  .card-type-indicator.input {
    background-color: var(--chart-color-2);
  }
  .card-type-indicator.sequencing {
    background-color: var(--chart-color-3);
  }
  .card-inputs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-top: 1.2rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field label {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
    padding-left: var(--space-xs);
  }
  .card-inputs textarea {
    min-height: 40px;
    resize: none;
    overflow: hidden;
  }
  .sequence-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    border-radius: var(--radius-sm);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
  }
  .sequence-item .drag-handle {
    cursor: grab;
    color: var(--color-text-tertiary);
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .sequence-item:hover .drag-handle {
    opacity: 1;
  }
  .sequence-item.is-dragging {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: var(--shadow-lg);
    background: var(--color-background-raised);
  }
  .sequence-item.drop-target {
    background: hsl(var(--color-accent-hsl) / 0.1);
    box-shadow: inset 0 0 0 2px var(--color-accent);
  }
  .add-item-button {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-accent);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    align-self: flex-start;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s;
  }
  .add-item-button:hover {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
  }
  .remove-card-button,
  .remove-item-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    color: var(--color-text-secondary);
    opacity: 0.6;
    transition: all 0.2s;
  }
  .card-wrapper:hover .remove-card-button,
  .sequence-item:hover .remove-item-button {
    opacity: 1;
  }
  .remove-card-button:hover,
  .remove-item-button:hover {
    color: var(--color-danger);
    background-color: var(--color-danger-bg);
  }
  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    padding: var(--space-xl) 0;
  }
  .empty-state h4 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: var(--space-md) 0 0 0;
  }
  .empty-state p {
    margin: var(--space-xs) 0 0 0;
  }
  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: var(--width-panel-lg);
      border-radius: var(--radius-lg);
      bottom: var(--space-lg);
      max-height: 80vh;
    }
  }
</style>
