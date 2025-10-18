<!--
  @component
  LanguageSwitcher

  This component provides a UI for the user to switch the application's language.
  It displays the current language and, upon interaction, shows a dropdown menu
  with all available languages. Selecting a new language updates the URL,
  triggering SvelteKit's routing to render the page in the chosen locale.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // --- Svelte and SvelteKit Imports ---
  import { locale, translations, t } from '$lib/utils/i18n';

  /** @state {boolean} showLangMenu - Toggles the visibility of the language dropdown. */
  let showLangMenu = false;

  /**
   * Toggles the language menu's visibility.
   */
  const handleLangMenu = () => {
    showLangMenu = !showLangMenu;
  };

  /**
   * Navigates to the corresponding URL for the selected language.
   * @param {string} lang - The language code to switch to (e.g., 'en', 'es').
   */
  const changeLanguage = (lang: string) => {
    const { pathname } = $page.url;
    const newPathname = pathname.replace(/^\/[^/]+/, `/${lang}`);
    goto(newPathname);
    showLangMenu = false;
  };
</script>

<div class="lang-switcher">
  <!-- Button displaying the current language, which also opens the menu. -->
  <button
    on:click={handleLangMenu}
    aria-haspopup="true"
    aria-expanded={showLangMenu}
  >
    {$t(`languages.${$locale}`)}
  </button>

  <!-- The language selection menu, shown when `showLangMenu` is true. -->
  {#if showLangMenu}
    <ul class="lang-menu" role="menu">
      {#each Object.keys(translations) as lang (lang)}
        <li role="presentation">
          <button role="menuitem" on:click={() => changeLanguage(lang)}>
            {$t(`languages.${lang}`)}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .lang-switcher {
    position: relative;
  }

  /* Styling for the button that shows the current language and opens the menu */
  button {
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-gray-600);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }

  /* Styling for the language dropdown menu */
  .lang-menu {
    position: absolute;
    top: calc(100% + var(--space-xs));
    right: 0;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
    padding: var(--space-xs);
    list-style: none;
    margin: 0;
    z-index: 10; /* Ensures the menu appears above other elements */
    box-shadow: var(--shadow-lg);
    min-width: 120px;
  }

  .lang-menu li button {
    width: 100%;
    text-align: left;
    color: var(--color-text);
  }

  .lang-menu li button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }

  /* Dark Mode Styles */
  :global(.dark-theme) button {
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) button:hover {
    background-color: var(--btn-hover-bg-dark);
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .lang-menu {
    background-color: var(--color-background-dark-raised);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .lang-menu li button {
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .lang-menu li button:hover {
    background-color: var(--btn-hover-bg-dark);
  }
</style>
