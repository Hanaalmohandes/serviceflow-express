<script lang="ts">
  let { data, children } = $props();

  const labels: Record<string, Record<string, string>> = {
    en: { tenants: 'Tenants', users: 'Users', departments: 'Departments', requests: 'My Requests', preferences: 'Preferences', notifications: 'Notifications', logout: 'Log out' },
    ar: { tenants: 'المؤسسات', users: 'المستخدمون', departments: 'الأقسام', requests: 'طلباتي', preferences: 'التفضيلات', notifications: 'الإشعارات', logout: 'تسجيل الخروج' },
    fr: { tenants: 'Organisations', users: 'Utilisateurs', departments: 'Services', requests: 'Mes demandes', preferences: 'Préférences', notifications: 'Notifications', logout: 'Déconnexion' },
    es: { tenants: 'Organizaciones', users: 'Usuarios', departments: 'Departamentos', requests: 'Mis solicitudes', preferences: 'Preferencias', notifications: 'Notificaciones', logout: 'Cerrar sesión' },
    de: { tenants: 'Organisationen', users: 'Benutzer', departments: 'Abteilungen', requests: 'Meine Anfragen', preferences: 'Einstellungen', notifications: 'Benachrichtigungen', logout: 'Abmelden' }
  };

  let language = $derived(data.language || 'en');
  let text = $derived(labels[language] || labels.en);

  $effect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  });
</script>

{#if data.user}
  <nav>
    <div class="nav-links">
      {#if data.user.isHost}
        <a href="/tenants">{text.tenants}</a>
        <a href="/users">{text.users}</a>
        <a href="/departments">{text.departments}</a>
      {:else}
        <a href="/requests">{text.requests}</a>
        {#if data.user.role === 'Admin'}
          <a href="/departments">{text.departments}</a>
        {/if}
      {/if}
      <a href="/notifications">{text.notifications}</a>
      <a href="/preferences">{text.preferences}</a>
    </div>
    <form method="POST" action="/logout">
      <button type="submit">{text.logout}</button>
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
