<!-- src/lib/components/layout/AppHeader.svelte (FINAL VERSION WITH INTEGRATED HELP) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Logo from '$lib/components/ui/Logo.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';
  import Icon from '$lib/components/ui/Icon.svelte'; // Import Icon for the kbd
  import { t } from '$lib/utils/i18n';

  const dispatch = createEventDispatcher();

  function showWelcome() {
    dispatch('showWelcome');
  }

  // Allows the parent to pass dynamic classes (e.g., for entrance animations)
  let className = '';
  export { className as class };
</script>

<header class="app-header {className}">
  <div class="header-content">
    <!-- Left Section: A placeholder for future actions like 'Menu' or 'Back' -->
    <div class="header-section left">
      <slot />
    </div>

    <!-- Center Section: The brand, perfectly centered -->
    <div class="header-section center">
      <button
        class="brand-button"
        on:click={showWelcome}
        aria-label={$t('appHeader.aria.returnToWelcome')}
      >
        <div class="logo-wrapper">
          <Logo size={28} />
        </div>
        <h1 class="brand-name">
          Schemas<span class="accent-word">.Work</span>
        </h1>
      </button>
    </div>

    <!-- Right Section: Contains global actions like help -->
    <div class="header-section right">
      <!-- We hide the tooltip on small touch screens where it is not useful -->
      <div class="desktop-only-tooltip">
        <HelpTooltip>
          <!-- *** START OF THE SOLUTION: VISUAL IMPROVEMENT OF THE TOOLTIP *** -->
          <div class="shortcuts">
            <div class="shortcut-item">
              <span>{$t('appHeader.shortcuts.menu')}</span>
              <div class="keys">
                <kbd>Ctrl</kbd><span>+</span><kbd>K</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span>{$t('appHeader.shortcuts.editCards')}</span>
              <div class="keys">
                <kbd>Ctrl</kbd><span>+</span><kbd>'</kbd>
              </div>
            </div>
          </div>
          <!-- *** END OF THE SOLUTION *** -->
        </HelpTooltip>
      </div>
    </div>
  </div>
</header>

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    background-color: var(--color-background);
    border-bottom: 1px solid var(--color-gray-100);
    padding: var(--space-sm) 0;
    transition: all 0.3s ease;
  }

  .header-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 36px; /* Fixed height for consistency */
  }

  /* --- 3-Column Structure --- */
  .header-section {
    flex: 1;
    display: flex;
    align-items: center;
  }
  .header-section.left {
    justify-content: flex-start;
  }
  .header-section.center {
    justify-content: center;
  }
  .header-section.right {
    justify-content: flex-end;
  }

  /* --- Brand Styles --- */
  .brand-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    transition: background-color 0.2s ease;
    color: var(--color-text);
  }

  .brand-button:hover {
    background-color: var(--color-gray-100);
  }

  .logo-wrapper {
    display: grid;
    place-items: center;
    transition: transform 0.3s ease;
  }

  .brand-button:hover .logo-wrapper {
    transform: rotate(-15deg) scale(1.1);
  }

  .brand-name {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }

  .accent-word {
    color: var(--color-accent);
  }

  /* --- Help Tooltip Styles --- */

  /* *** START OF THE SOLUTION: NEW STYLES FOR THE TOOLTIP *** */
  :global(.shortcuts) {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-xs);
  }

  :global(.shortcut-item) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-lg);
  }

  :global(.keys) {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :global(.shortcuts kbd) {
    font-family: var(--font-main);
    font-size: 0.75rem;
    font-weight: 600;
    background-color: var(--color-gray-100);
    color: var(--color-text);
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid var(--color-gray-200);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  }
  /* *** END OF THE SOLUTION *** */

  @media (max-width: 768px) {
    .desktop-only-tooltip {
      display: none;
    }
  }

  @media (prefers-color-scheme: dark) {
    .app-header {
      border-bottom-color: var(--color-gray-100);
    }
    :global(.shortcuts kbd) {
      background-color: var(--color-gray-200);
      border-color: var(--color-gray-500);
      color: var(--color-text);
    }
  }
</style>
