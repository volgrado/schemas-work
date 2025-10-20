<!-- src/lib/components/ui/TagInput.svelte -->
<script lang="ts">
  // Define the 'oninput' prop, making it an optional function that returns void
  let {
    tags,
    id = undefined,
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
