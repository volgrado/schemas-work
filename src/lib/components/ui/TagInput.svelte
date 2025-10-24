<!--
  @component
  TagInput

  A simple text input for entering space-separated tags. It synchronizes its
  internal string value with an external array of strings (`tags`).

  Props:
  - `tags`: {string[]} - An array of strings representing the tags. This prop is bindable.
  - `id`: {string} [id=undefined] - The `id` attribute for the input element.
  - `oninput`: {() => void} [oninput=() => {}] - A callback function that is invoked when the input's value changes.
-->
<script lang="ts">
  /**
   * @prop {string[]} tags
   * An array of strings representing the tags. This prop is bindable.
   * @bindable
   */
  let {
    tags,
    /**
     * @prop {string} [id=undefined]
     * The `id` attribute for the input element.
     */
    id = undefined,
    /**
     * @prop {() => void} [oninput=() => {}]
     * A callback function that is invoked when the input's value changes.
     */
    oninput = () => {},
  } = $props<{
    tags: string[];
    id?: string;
    oninput?: () => void;
  }>();

  let value = $state(tags.join(' '));

  $effect(() => {
    const externalValue = tags.join(' ');
    if (externalValue !== value) {
      value = externalValue;
    }
  });

  function handleInput() {
    // This part remains the same: mutate the tags array
    tags = value.split(' ').filter((t: string) => t.length > 0);
    // Now, call the function passed in by the parent
    oninput();
  }
</script>

<input
  type="text"
  {id}
  bind:value
  oninput={handleInput}
  placeholder="Add tags separated by spaces..."
/>
