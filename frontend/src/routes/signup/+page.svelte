<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<svelte:head>
  <title>Sign up</title>
</svelte:head>

<div class="auth-wrapper">
  <div class="auth-card">
    <h1>Create your account</h1>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <form method="POST" use:enhance>
      <label>
        Organization name
        <input type="text" name="tenantName" required autocomplete="organization" />
      </label>

      <label>
        Organization slug
        <input
          type="text"
          name="tenantSlug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Use lowercase letters, numbers, and hyphens only."
          placeholder="my-company"
        />
      </label>

      <label>
        Name
        <input type="text" name="name" required autocomplete="name" />
      </label>

      <label>
        Email
        <input type="email" name="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input type="password" name="password" required autocomplete="new-password" />
      </label>

      <button type="submit">Create account</button>
    </form>

    <p class="auth-link">
      Already have an account? <a href="/login">Log in</a>
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
    border: 1px solid rgb(100, 95, 89);
    border-radius: 8px;
  }

  h1 {
    margin-bottom: 1.5rem;
    color: rgb(100, 95, 89);
    font-size: 1.5rem;
    text-align: center;
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
    color: rgb(100, 95, 89);
    font-size: 0.9rem;
  }

  input {
    padding: 0.6rem 0.75rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: rgb(140, 134, 126);
  }

  button {
    padding: 0.65rem;
    border: none;
    border-radius: 4px;
    background: white;
    color: rgb(140, 134, 126);
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover {
    background: white;
  }

  .error {
    margin-bottom: 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    background: #fdecea;
    color: #b3261e;
    font-size: 0.9rem;
  }

  .auth-link {
    margin: 1.25rem 0 0;
    text-align: center;
    color: rgb(100, 95, 89);
    font-size: 0.9rem;
  }

  .auth-link a {
    color: rgb(100, 95, 89);
    font-weight: 600;
  }
</style>
