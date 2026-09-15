<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head>
  <title>Log in</title>
</svelte:head>

<div class="auth-wrapper">
  <div class="auth-card">
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
        <input type="password" name="password" required autocomplete="current-password" maxlength="128" />
      </label>

      <button type="submit">Log in</button>
    </form>

    <p class="auth-link">
      Need an account? <a href="/signup">Sign up</a>
    </p>
  </div>
</div>

<style>
  .auth-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
  }

  .auth-card {
    width: 100%;
    max-width: 360px;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid rgb(100, 95, 89);
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
    color: rgb(100, 95, 89);
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
    color: rgb(100, 95, 89);
  }

  input {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
  }

  input:focus {
    outline: none;
    border-color: rgb(140, 134, 126);
  }

  button {
    padding: 0.65rem;
    font-size: 1rem;
    background: white;
    color: rgb(140, 134, 126);
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

  .auth-link {
    margin: 1.25rem 0 0;
    text-align: center;
    font-size: 0.9rem;
    color: rgb(100, 95, 89);
  }

  .auth-link a {
    color: rgb(100, 95, 89);
    font-weight: 600;
  }
</style>
