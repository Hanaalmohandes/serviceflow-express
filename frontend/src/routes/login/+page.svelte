<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head>
  <title>Log in</title>
</svelte:head>

<div class="login-wrapper">
  <div class="login-card">
    <h1>Log in</h1>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <form method="POST" use:enhance>
      <label>
        Email
        <input type="email" name="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input type="password" name="password" required autocomplete="current-password" />
      </label>

      <button type="submit">Log in</button>
    </form>
  </div>
</div>

<style>
  .login-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--color-beige);
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
    color: var(--color-brown-dark);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--color-brown);
  }

  input {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    border: 1px solid var(--color-beige);
    border-radius: 4px;
  }

  input:focus {
    outline: none;
    border-color: var(--color-brown-soft);
  }

  button {
    padding: 0.65rem;
    font-size: 1rem;
    background: white;
    color: var(--color-brown);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: white;
  }

  .error {
    background: #fdecea;
    color: #b3261e;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
</style>