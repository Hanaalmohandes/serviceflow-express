<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let editingId = $state<string | null>(null);

  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
</script>

<svelte:head>
  <title>My Requests</title>
</svelte:head>

<div class="page">
  <h1>My Requests</h1>
  
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <!-- Create form -->
  <form method="POST" action="?/create" use:enhance class="create-form">
    <input type="text" name="title" placeholder="Request title" required />
    <input type="text" name="description" placeholder="Description" />
    <button type="submit">New Request</button>
  </form>

  {#if data.requests.length === 0}
    <p class="empty">No requests yet.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.requests as req (req.id)}
          <tr>
            {#if editingId === req.id}
              <!-- EDIT MODE: Entire row is wrapped inside a single form element -->
              <td colspan="5">
                <form 
                  method="POST" 
                  action="?/edit" 
                  use:enhance={() => {
                    return async ({ result, update }) => {
                      if (result.type === 'success') {
                        editingId = null; // Close edit mode on success
                      }
                      await update();
                    };
                  }} 
                  class="edit-row-form"
                >
                  <input type="hidden" name="id" value={req.id} />
                  
                  <input type="text" name="title" value={req.title} required class="edit-input" />
                  
                  <input type="text" name="description" value={req.description ?? ''} placeholder="Description" class="edit-input" />

                  <select name="priority" value={req.priority} class="edit-select">
                    {#each priorities as level}
                      <option value={level}>{level}</option>
                    {/each}
                  </select>

                  <div class="edit-buttons">
                    <button type="submit">Save</button>
                    <button type="button" onclick={() => (editingId = null)} class="cancel-btn">Cancel</button>
                  </div>
                </form>
              </td>
            {:else}
              <!-- VIEW MODE -->
              <td>{req.title}</td>
              <td><span class="badge">{req.status}</span></td>
              <td><span class="priority-text">{req.priority}</span></td>
              <td>{new Date(req.created_at).toLocaleDateString()}</td>
              <td class="actions">
                <button onclick={() => (editingId = req.id)}>Edit</button>
                <form method="POST" action="?/delete" use:enhance style="display: inline">
                  <input type="hidden" name="id" value={req.id} />
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
  .edit-buttons button {
    padding: 0.4rem 0.8rem;
    background: rgb(100, 95, 89);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .cancel-btn {
    background: #6c757d !important;
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

  /* Layout for the full edit row form */
  .edit-row-form {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    width: 100%;
  }

  .edit-input,
  .edit-select {
    padding: 0.35rem 0.5rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .edit-buttons {
    display: flex;
    gap: 0.4rem;
    margin-left: auto;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    background: rgb(100, 95, 89);
    color: white;
  }

  .priority-text {
    font-weight: 500;
  }

  .error {
    background: #fdecea;
    color: #b3261e;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
</style>