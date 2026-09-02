<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let editingId = $state<string | null>(null);
</script>

<svelte:head>
  <title>Tenants</title>
</svelte:head>

<div class="page">
  <h1>Tenants</h1>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <form method="POST" action="?/create" use:enhance class="create-form">
    <input type="text" name="name" placeholder="Tenant name" required />
    <input type="text" name="slug" placeholder="slug" required />
    <button type="submit">Add Tenant</button>
  </form>

  {#if data.tenants.length === 0}
    <p class="empty">No tenants yet.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Active</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.tenants as tenant (tenant.id)}
          <tr>
            {#if editingId === tenant.id}
              <!-- EDIT MODE -->
              <td colspan="4">
                <form 
                  method="POST" 
                  action="?/edit" 
                  use:enhance={() => {
                    return async ({ result, update }) => {
                      // 1. Force SvelteKit to run load() and refresh page data first
                      await update({ reset: false });
                      
                      // 2. Only close edit mode after the page state has updated
                      if (result.type === 'success') {
                        editingId = null;
                      }
                    };
                  }} 
                  class="edit-form"
                >
                  <input type="hidden" name="id" value={tenant.id} />
                  <input type="text" name="name" value={tenant.name} required />
                  <input type="text" name="slug" value={tenant.slug} required />
                  
                  <select name="is_active" value={String(tenant.is_active)}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>

                  <button type="submit">Save</button>
                  <button type="button" onclick={() => (editingId = null)}>Cancel</button>
                </form>
              </td>
              <td></td>
            {:else}
              <!-- VIEW MODE -->
              <td>{tenant.name}</td>
              <td>{tenant.slug}</td>
              <td>{tenant.is_active ? 'Yes' : 'No'}</td>
              <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
              <td class="actions">
                <button onclick={() => (editingId = tenant.id)}>Edit</button>
                <form method="POST" action="?/delete" use:enhance style="display: inline">
                  <input type="hidden" name="id" value={tenant.id} />
                  <button type="submit">Delete</button>
                </form>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .page {
    max-width: 800px;
    margin: 3rem auto;
    padding: 0 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: rgb(100, 95, 89);
  }

  .create-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .create-form input {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
  }

  .create-form button,
  .actions button,
  .edit-form button {
    padding: 0.5rem 0.9rem;
    background: white;
    color: rgb(140, 134, 126);
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
    cursor: pointer;
  }

  .create-form button:hover,
  .actions button:hover,
  .edit-form button:hover {
    background: rgb(100, 95, 89);
    color: white;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    background: white;
  }

  th,
  td {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid rgb(100, 95, 89);
  }

  th {
    font-weight: 600;
    color: rgb(100, 95, 89);
    border-bottom: 2px solid rgb(100, 95, 89);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .edit-form input,
  .edit-form select {
    padding: 0.35rem 0.6rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
    background: white;
  }

  .empty {
    color: rgb(100, 95, 89);
    font-size: 0.95rem;
  }

  .error {
    background: #fdecea;
    color: #b3261e;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
</style>