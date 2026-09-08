<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head><title>System users</title></svelte:head>

<main>
  <h1>System users</h1>
  <p>Manage each organization member as an Admin or Regular user.</p>

  {#if form?.error || data.error}
    <p class="error">{form?.error ?? data.error}</p>
  {:else if data.users.length === 0}
    <p>No users found.</p>
  {:else}
    <table>
      <thead>
        <tr><th>User</th><th>Email</th><th>Organization</th><th>Department</th><th>Current role</th><th>Access</th><th>Delete</th></tr>
      </thead>
      <tbody>
        {#each data.users as user (user.membership_id ?? user.id)}
          <tr>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.tenant_name ?? '—'}</td>
            <td>{user.department_name ?? '—'}</td>
            <td>{user.is_host ? 'Host' : (user.role ?? 'No organization')}</td>
            <td>
              {#if user.membership_id}
                <form method="POST" action="?/updateRole">
                  <input type="hidden" name="membershipId" value={user.membership_id} />
                  <select name="role" value={user.role} aria-label={`Role for ${user.name}`}>
                    <option value="Employee">Regular user</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <select name="departmentId" value={user.department_id} aria-label={`Department for ${user.name}`}>
                    {#each data.departments.filter((department: { id: string; tenant_id: string; is_active: boolean }) => department.tenant_id === user.tenant_id && department.is_active) as department}
                      <option value={department.id}>{department.name}</option>
                    {/each}
                  </select>
                  <button type="submit">Save</button>
                </form>
              {:else}
                <span>—</span>
              {/if}
            </td>
            <td>
              {#if !user.is_host}
                <form method="POST" action="?/deleteUser" onsubmit={(event) => {
                  if (!confirm(`Delete ${user.name}? This also removes their related requests, comments, and notifications.`)) {
                    event.preventDefault();
                  }
                }}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button class="delete" type="submit">Delete user</button>
                </form>
              {:else}
                <span>—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</main>

<style>
  main { max-width: 1080px; margin: 3rem auto; padding: 0 1.5rem; }
  h1 { color: #645f59; }
  table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  th, td { padding: .7rem; text-align: left; border-bottom: 1px solid #ddd; }
  form { display: flex; gap: .5rem; align-items: center; }
  select, button { padding: .4rem .55rem; font: inherit; }
  button { border: 0; border-radius: 4px; color: white; background: #645f59; cursor: pointer; }
  button.delete { background: #b3261e; }
  .error { color: #b3261e; }
</style>
