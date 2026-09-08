<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head><title>Departments</title></svelte:head>

<main>
  <h1>Departments</h1>
  <p>Departments route requests and determine which requests regular users can access.</p>
  {#if form?.error}<p class="error">{form.error}</p>{/if}

  <form method="POST" action="?/create" class="create-form">
    <input name="name" required placeholder="Department name" />
    {#if data.isHost}
      <select name="tenantId" required>
        <option value="" disabled selected>Select organization</option>
        {#each data.tenants as tenant}<option value={tenant.id}>{tenant.name}</option>{/each}
      </select>
    {/if}
    <button type="submit">Add department</button>
  </form>

  <ul>
    {#each data.departments as department (department.id)}
      <li>
        <span><strong>{department.name}</strong>{#if data.isHost} · {department.tenant_name}{/if}</span>
        <form method="POST" action="?/toggle">
          <input type="hidden" name="id" value={department.id} />
          <input type="hidden" name="isActive" value={department.is_active ? 'false' : 'true'} />
          <button type="submit">{department.is_active ? 'Deactivate' : 'Activate'}</button>
        </form>
      </li>
    {/each}
  </ul>
</main>

<style>
  main { max-width: 760px; margin: 3rem auto; padding: 0 1.5rem; }
  h1 { color: #645f59; }
  .create-form, li { display: flex; gap: .6rem; align-items: center; }
  .create-form { margin: 1.5rem 0; }
  input, select, button { padding: .5rem .65rem; font: inherit; }
  button { border: 0; border-radius: 4px; color: white; background: #645f59; cursor: pointer; }
  ul { padding: 0; list-style: none; }
  li { justify-content: space-between; padding: .75rem 0; border-bottom: 1px solid #ddd; }
  .error { color: #b3261e; }
</style>
