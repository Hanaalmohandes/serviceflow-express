<script lang="ts">
  let { data, children } = $props();
  console.log('LAYOUT DATA:', data);
</script>

{#if data.user}
  <nav>
    <div class="nav-links">
      {#if data.user.isHost}
        <a href="/tenants">Tenants</a>
      {:else}
        <a href="/requests">My Requests</a>
      {/if}
    </div>
    <form method="POST" action="/logout">
      <button type="submit">Log out</button>
    </form>
  </nav>
{/if}

{@render children()}

<style>
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgb(100, 95, 89);
    border-bottom: 1px solid rgb(100, 95, 89);
  }

  .nav-links a {
    color: rgb(253, 253, 253);
    text-decoration: none;
    font-weight: 500;
  }

  .nav-links a:hover {
    color: rgb(100, 95, 89);
  }

  nav button {
    padding: 0.4rem 0.9rem;
    background: white;
    color: rgb(161, 155, 147);
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
    cursor: pointer;
  }

  nav button:hover {
    background: rgb(100, 95, 89);
  }
</style>
