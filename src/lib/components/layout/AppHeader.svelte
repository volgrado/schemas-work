<!--
  @component
  AppHeader

  This component serves as the global header for the main application view.
  It is designed with a three-column layout to ensure a balanced and scalable structure.

  Features:
  - **Three-Column Layout**:
    - **Left Slot**: A flexible area where parent components can inject custom controls (e.g., a view-switcher button).
    - **Center**: Displays the application brand and logo. Clicking it dispatches an event to return to the welcome screen.
    - **Right Section**: Contains global actions like the `LanguageSwitcher` and a `HelpTooltip` with keyboard shortcuts.
  - **Event-Driven**: Dispatches a `showWelcome` event instead of directly handling navigation, promoting component decoupling.
  - **Styling Flexibility**: Exports a `class` prop, allowing parent components to pass down custom CSS classes (e.g., for animations).

  Events:
  - `showWelcome`: Dispatched when the central brand/logo is clicked.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // --- UI Components & Utilities ---
  import Logo from '$lib/components/ui/Logo.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';
  import { t } from '$lib/utils/i18n';
  import LanguageSwitcher from '$lib/components/layout/LanguageSwitcher.svelte';

  const dispatch = createEventDispatcher<{ showWelcome: void }>();

  /**
   * Dispatches the 'showWelcome' event to the parent component.
   */
  function showWelcome() {
    dispatch('showWelcome');
  }

  /** @props {string} class - Allows passing a custom CSS class from the parent. */
  let className = '';
  export { className as class };
</script>

<header class="app-header {className}">
  <div class="header-content">
    <!-- Left Section: A slot for parent-provided controls. -->
    <div class="header-section left">
      <slot />
    </div>

    <!-- Center Section: The clickable brand logo and name. -->
    <div class="header-section center">
      <button class="brand-button" on:click={showWelcome} aria-label={t('appHeader.aria.returnToWelcome')}>
        <div class="logo-wrapper"><Logo size={28} /></div>
        <h1 class="brand-name">Schemas<span class="accent-word">.Work</span></h1>
      </button>
    </div>

    <!-- Right Section: Global actions like language and help. -->
    <div class="header-section right">
      <LanguageSwitcher />
      <!-- The help tooltip is hidden on smaller screens for a cleaner mobile experience. -->
      <div class="desktop-only-tooltip">
        <HelpTooltip>
          <div class="shortcuts">
            <div class="shortcut-item">
              <span>{t('appHeader.shortcuts.menu')}</span>
              <div class="keys"><kbd>Ctrl</kbd><span>+</span><kbd>K</kbd></div>
            </div>
            <div class="shortcut-item">
              <span>{t('appHeader.shortcuts.editCards')}</span>
              <div class="keys"><kbd>Ctrl</kbd><span>+</span><kbd>'</kbd></div>
            </div>
          </div>
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
    background-color: var(--color-background-translucent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-border);
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
  .header-section { flex: 1; display: flex; align-items: center; gap: var(--space-sm); }
  .header-section.left { justify-content: flex-start; }
  .header-section.center { justify-content: center; }
  .header-section.right { justify-content: flex-end; }

  /* --- Brand Styles --- */
  .brand-button { display: flex; align-items: center; gap: var(--space-sm); background: none; border: none; cursor: pointer; padding: var(--space-xs) var(--space-sm); border-radius: var(--space-sm); transition: background-color 0.2s ease; color: var(--color-text); }
  .brand-button:hover { background-color: var(--color-gray-100); }
  .logo-wrapper { display: grid; place-items: center; transition: transform 0.3s ease; }
  .brand-button:hover .logo-wrapper { transform: rotate(-15deg) scale(1.1); }
  .brand-name { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--color-text); letter-spacing: -0.03em; }
  .accent-word { color: var(--color-accent); }

  /* --- Help Tooltip Styles --- */
  :global(.shortcuts) { display: flex; flex-direction: column; gap: var(--space-sm); padding: var(--space-xs); }
  :global(.shortcut-item) { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: var(--space-lg); }
  :global(.keys) { display: flex; align-items: center; gap: 4px; }
  :global(.shortcuts kbd) { font-family: var(--font-main); font-size: 0.75rem; font-weight: 600; background-color: var(--color-gray-100); color: var(--color-text); padding: 3px 6px; border-radius: 6px; border: 1px solid var(--color-gray-200); box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1); }

  @media (max-width: 768px) {
    .desktop-only-tooltip { display: none; }
  }

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    .app-header { border-bottom-color: var(--color-border-dark); }
    .brand-button:hover { background-color: var(--color-gray-800); }
    :global(.shortcuts kbd) { background-color: var(--color-gray-700); border-color: var(--color-gray-600); color: var(--color-text-dark); }
  }
</style>
