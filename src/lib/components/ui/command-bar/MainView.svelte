<script lang="ts">
  /**
   * MainView.svelte
   *
   * Componente de vista para la CommandBar que muestra la lista principal de acciones.
   * Es un componente "presentacional": su única responsabilidad es renderizar
   * los comandos obtenidos del `commandService`.
   *
   * Buenas Prácticas Aplicadas:
   * - Componente de Responsabilidad Única (SRP).
   * - Accesibilidad (A11y): Usa un <nav> semántico y un título oculto para lectores de pantalla.
   * - Rendimiento: Utiliza una `key` en el bloque #each para un renderizado eficiente.
   * - Código Limpio: Mínima lógica, fácil de leer y mantener.
   */

  // --- Dependencias ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as commandService from '$lib/services/features/commandService';

  // Obtenemos la lista de comandos una sola vez al montar el componente.
  const commands = commandService.getCommands();
</script>

<!--
  Usamos <nav> para la semántica, ya que esta lista es la navegación principal
  dentro del diálogo de la CommandBar. `aria-labelledby` lo asocia con el título
  oculto para dar contexto a los lectores de pantalla.
-->
<nav class="action-list" aria-labelledby="commandbar-title">
  <!--
    Este título está visualmente oculto pero es crucial para la accesibilidad,
    anunciando el propósito de esta sección a los usuarios de lectores de pantalla.
  -->
  <h2 id="commandbar-title" class="visually-hidden">
    Menú Principal de Comandos
  </h2>

  <!--
    Iteramos sobre los comandos. El uso de `(command.id)` como "key" es vital
    para que Svelte pueda optimizar el renderizado de la lista de forma eficiente.
  -->
  {#each commands as command (command.id)}
    <button
      class="action-button"
      on:click={command.action}
      disabled={command.isEnabled && !command.isEnabled()}
    >
      <Icon name={command.icon} size={18} />
      <span>{command.label}</span>
    </button>
  {/each}
</nav>

<style>
  /*
    Este componente hereda la mayoría de sus estilos (como .action-button)
    del componente padre `CommandBar.svelte` para mantener la consistencia visual.
    Solo definimos estilos que son absolutamente necesarios para este componente.
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
</style>
