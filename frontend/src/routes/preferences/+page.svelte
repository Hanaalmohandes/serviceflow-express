<script lang="ts">
  let { data, form } = $props();

  const languages = [
    ['en', 'English'],
    ['ar', 'العربية'],
    ['fr', 'Français'],
    ['es', 'Español'],
    ['de', 'Deutsch']
  ];
</script>

<svelte:head><title>Preferences</title></svelte:head>

<main>
  <h1>Language preference</h1>
  <p>This setting is saved to your account and follows you wherever you sign in.</p>

  {#if data.error || form?.error}
    <p class="error">{form?.error ?? data.error}</p>
  {/if}
  <form method="POST">
    <label for="language">Display language</label>
    <select id="language" name="language" value={data.language}>
      {#each languages as [value, label]}
        <option {value}>{label}</option>
      {/each}
    </select>
    <button type="submit">Save preference</button>
  </form>
</main>

<style>
  main { max-width: 560px; margin: 3rem auto; padding: 0 1.5rem; }
  p { color: #645f59; }
  form { display: grid; gap: .75rem; margin-top: 1.5rem; }
  select, button { padding: .6rem .75rem; font: inherit; }
  button { width: fit-content; background: #645f59; color: white; border: 0; border-radius: 4px; cursor: pointer; }
  .error { color: #b3261e; }
</style>
