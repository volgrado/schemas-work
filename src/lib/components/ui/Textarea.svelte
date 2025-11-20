<!--
  @component
  Textarea

  @description
  An exceptional, reusable textarea component that automatically resizes to fit its content,
  optionally displays a character counter, and allows a parent to get a direct reference
  to the underlying DOM element for advanced control.

  @props
  - `value`: {string} (bindable) - The value of the textarea.
  - `maxlength`: {number} (optional) - The maximum allowed characters. Enables the counter.
  - `textareaElement`: {HTMLTextAreaElement | null} (bindable) - A reference to the native textarea element.

  @restProps All other standard HTML attributes (e.g., `placeholder`, `rows`, `disabled`, `readonly`)
  are passed directly to the underlying `<textarea>` element.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { autosize } from '$lib/actions/autosize';

  let {
    /**
     * @prop {string} [value='']
     * The textarea's value. Can be bound to a variable in the parent component.
     * @bindable
     */
    value = $bindable(''),

    /**
     * @prop {number | undefined} [maxlength]
     * If provided, displays a character counter and enforces the maximum length.
     */
    maxlength,

    /**
     * @prop {HTMLTextAreaElement | null} [textareaElement]
     * A bindable reference to the underlying native textarea element. Useful for
     * programmatic focusing or other direct DOM manipulations from a parent.
     * @bindable
     */
    textareaElement = $bindable<HTMLTextAreaElement | null>(),

    /**
     * @prop {boolean} [invalid=false]
     * If true, applies error styling to the textarea.
     */
    invalid = false,

    ...rest
  } = $props<
    {
      value?: string;
      maxlength?: number;
      textareaElement?: HTMLTextAreaElement | null;
      invalid?: boolean;
    } & HTMLTextareaAttributes
  >();

  const counterId = `textarea-counter-${Math.random().toString(36).substring(2, 9)}`;

  // --- Reactive state for the character counter ---
  const chars = $derived(value.length);
  const isOverLimit = $derived(maxlength != null && chars > maxlength);
  const isNearLimit = $derived(
    maxlength != null && !isOverLimit && chars >= maxlength * 0.9
  );
</script>

<div class="textarea-wrapper">
  <textarea
    {...rest}
    class={`textarea ${rest.class ?? ''}`}
    class:is-invalid={invalid}
    bind:value
    {maxlength}
    use:autosize
    aria-describedby={maxlength != null ? counterId : undefined}
    bind:this={textareaElement}
  ></textarea>

  {#if maxlength != null}
    <div
      id={counterId}
      class="counter"
      class:near-limit={isNearLimit}
      class:over-limit={isOverLimit}
      aria-live="polite"
      aria-atomic="true"
    >
      {chars} / {maxlength}
    </div>
  {/if}
</div>

<style>
  .textarea-wrapper {
    position: relative;
  }

  .textarea {
    /* All core styles are inherited from the global `textarea` styles in `app.css`. */
    min-height: 80px;
  }

  .textarea.is-invalid {
    border-color: var(--color-danger);
  }
  .textarea.is-invalid:focus {
    border-color: var(--color-danger);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); /* Red ring */
  }

  .counter {
    position: absolute;
    bottom: var(--space-sm);
    right: var(--space-md);
    font-size: 0.8rem;
    font-family: var(--font-mono);
    color: var(--color-text-tertiary);
    background-color: var(--color-page-background);
    padding: 2px var(--space-xs);
    border-radius: var(--border-radius-sm);
    transition: color 0.2s ease;
    user-select: none;
  }

  .counter.near-limit {
    color: var(--color-orange-500);
    font-weight: 500;
  }

  .counter.over-limit {
    color: var(--color-danger);
    font-weight: 600;
  }

  :global(.dark-theme) .counter {
    background-color: var(--color-page-background);
  }
</style>
