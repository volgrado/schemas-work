<script lang="ts">
  /**
   * AiView.svelte
   *
   * Componente de vista para la CommandBar que muestra las acciones específicas del Asistente de IA.
   * Al ser una sub-vista, también incluye una acción para volver al menú principal.
   *
   * Buenas Prácticas Aplicadas:
   * - Componente de Responsabilidad Única (SRP): Renderiza la lista de comandos de IA y la opción de volver.
   * - Accesibilidad (A11y): Usa <nav> semántico y un título oculto para un contexto claro.
   * - Código Limpio: Lógica declarativa obtenida de servicios y stores.
   * - Consistencia: Mantiene la misma estructura y calidad que MainView.svelte.
   */

  // --- Dependencias ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as commandService from '$lib/services/features/commandService';
  import { commandBarStore } from '$lib/stores/commandBarStore';

  // Obtenemos la lista de comandos de IA del servicio centralizado.
  const aiCommands = commandService.getAiCommands();
</script>

<!--
  Al igual que en MainView, usamos <nav> para la semántica y `aria-labelledby` para
  la accesibilidad, asociándolo a un título único para esta vista.
-->
<nav class="action-list" aria-labelledby="ai-commands-title">
  <!--
    El título oculto es esencial para que los usuarios de lectores de pantalla
    entiendan que han navegado a un nuevo menú de acciones.
  -->
  <h2 id="ai-commands-title" class="visually-hidden">Menú de Acciones de IA</h2>

  {#each aiCommands as command (command.id)}
    <button
      class="action-button"
      on:click={command.action}
      disabled={command.isEnabled && !command.isEnabled()}
    >
      <Icon name={command.icon} size={18} />
      <span>{command.label}</span>
    </button>
  {/each}

  <!--
    Un separador visual y una acción de "Volver" son patrones de UX cruciales
    para sub-menús, asegurando que el usuario nunca se sienta perdido.
  -->
  <hr class="separator" />

  <button
    class="action-button"
    on:click={() => commandBarStore.setView('main')}
    aria-label="Volver al menú principal"
  >
    <Icon name="x" size={18} />
    <span>Volver</span>
  </button>
</nav>

<style>
  /*
    Este componente hereda la mayoría de sus estilos (como .action-button)
    del componente padre `CommandBar.svelte` para mantener la consistencia visual.
    Solo definimos estilos que son absolutamente necesarios aquí.
  */

  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    white-space: nowrap;
  }

  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: 4px 0;
  }

  /*
    Aseguramos que el separador se adapte al tema oscuro si la variable
    CSS está definida en un contexto superior (como en CommandBar.svelte).
  */
  @media (prefers-color-scheme: dark) {
    .separator {
      background-color: var(--panel-border-dark);
    }
  }
</style>
