<script lang="ts">
  let { data } = $props();

  const label = (type: string) => type.replaceAll('_', ' ');
  const copy: Record<string, { title: string; description: string; empty: string }> = {
    en: { title: 'Organization notifications', description: 'Updates for requests in your organization.', empty: 'No notifications yet.' },
    ar: { title: 'إشعارات المؤسسة', description: 'تحديثات الطلبات في مؤسستك.', empty: 'لا توجد إشعارات بعد.' },
    fr: { title: 'Notifications de l’organisation', description: 'Mises à jour des demandes de votre organisation.', empty: 'Aucune notification pour le moment.' },
    es: { title: 'Notificaciones de la organización', description: 'Actualizaciones de las solicitudes de tu organización.', empty: 'Aún no hay notificaciones.' },
    de: { title: 'Organisationsbenachrichtigungen', description: 'Aktualisierungen zu Anfragen in Ihrer Organisation.', empty: 'Noch keine Benachrichtigungen.' }
  };
  let text = $derived(copy[data.language] || copy.en);
</script>

<svelte:head><title>{text.title}</title></svelte:head>

<main>
  <h1>{text.title}</h1>
  <p>{text.description}</p>

  {#if data.error}
    <p class="error">{data.error}</p>
  {:else if data.notifications.length === 0}
    <p class="empty">{text.empty}</p>
  {:else}
    <ul>
      {#each data.notifications as notification (notification.id)}
        <li>
          <strong>{notification.message ?? label(notification.type)}</strong>
          <time datetime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  main { max-width: 760px; margin: 3rem auto; padding: 0 1.5rem; }
  h1 { color: #645f59; }
  p { color: #645f59; }
  ul { list-style: none; padding: 0; margin-top: 1.5rem; }
  li { display: flex; justify-content: space-between; gap: 1rem; padding: .85rem 1rem; border-bottom: 1px solid #ddd; }
  time { color: #756f68; font-size: .9rem; }
  .error { color: #b3261e; }
  .empty { margin-top: 1.5rem; }
</style>
