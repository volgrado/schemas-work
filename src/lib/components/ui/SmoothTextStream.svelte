<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    text: string;
    speed?: number; // ms per character
    cursor?: boolean;
  }

  let { text = '', speed = 15, cursor = true }: Props = $props();

  let displayedText = $state('');
  let targetText = $derived(text);
  let animationFrameId: number;
  let lastTime = 0;
  let charIndex = 0;

  function animate(time: number) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;

    if (delta >= speed && charIndex < targetText.length) {
      // Add one character
      displayedText = targetText.slice(0, charIndex + 1);
      charIndex++;
      lastTime = time;
    } else if (charIndex > targetText.length) {
      // Handle case where text prop is reset/cleared
      charIndex = targetText.length;
      displayedText = targetText;
    }

    if (charIndex < targetText.length) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // Ensure we match exactly at the end
      displayedText = targetText;
    }
  }

  $effect(() => {
    // When text changes, ensure animation is running if we are behind
    if (targetText.length > displayedText.length) {
      // If we were stopped, restart
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(animate);
    } else if (targetText.length < displayedText.length) {
      // Reset if text is cleared or shortened significantly
      displayedText = '';
      charIndex = 0;
      lastTime = 0;
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      cancelAnimationFrame(animationFrameId);
    }
  });
</script>

<div class="smooth-stream">
  <span class="content">{displayedText}</span>{#if cursor && displayedText.length < targetText.length}<span class="cursor">▋</span>{/if}
</div>

<style>
  .smooth-stream {
    white-space: pre-wrap; /* Preserve newlines */
    word-break: break-word;
  }
  
  .cursor {
    display: inline-block;
    margin-left: 2px;
    animation: blink 1s step-end infinite;
    color: var(--color-primary);
    font-size: 0.8em;
    vertical-align: baseline;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>
