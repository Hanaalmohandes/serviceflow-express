<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let editingId = $state<string | null>(null);

  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const translations: Record<string, Record<string, string>> = {
    en: { title: 'My Requests', requestTitle: 'Request title', description: 'Description', newRequest: 'New Request', empty: 'No requests yet.', status: 'Status', priority: 'Priority', created: 'Created', actions: 'Actions', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', Low: 'Low', Medium: 'Medium', High: 'High', Urgent: 'Urgent', Draft: 'Draft', Submitted: 'Submitted', Under_review: 'Under review', Approved: 'Approved', Rejected: 'Rejected', In_Progress: 'In progress', Completed: 'Completed' },
    ar: { title: 'طلباتي', requestTitle: 'عنوان الطلب', description: 'الوصف', newRequest: 'طلب جديد', empty: 'لا توجد طلبات بعد.', status: 'الحالة', priority: 'الأولوية', created: 'تاريخ الإنشاء', actions: 'الإجراءات', save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف', Low: 'منخفضة', Medium: 'متوسطة', High: 'عالية', Urgent: 'عاجلة', Draft: 'مسودة', Submitted: 'تم الإرسال', Under_review: 'قيد المراجعة', Approved: 'تمت الموافقة', Rejected: 'مرفوض', In_Progress: 'قيد التنفيذ', Completed: 'مكتمل' },
    fr: { title: 'Mes demandes', requestTitle: 'Titre de la demande', description: 'Description', newRequest: 'Nouvelle demande', empty: 'Aucune demande pour le moment.', status: 'Statut', priority: 'Priorité', created: 'Créée le', actions: 'Actions', save: 'Enregistrer', cancel: 'Annuler', edit: 'Modifier', delete: 'Supprimer', Low: 'Faible', Medium: 'Moyenne', High: 'Élevée', Urgent: 'Urgente', Draft: 'Brouillon', Submitted: 'Envoyée', Under_review: 'En révision', Approved: 'Approuvée', Rejected: 'Refusée', In_Progress: 'En cours', Completed: 'Terminée' },
    es: { title: 'Mis solicitudes', requestTitle: 'Título de la solicitud', description: 'Descripción', newRequest: 'Nueva solicitud', empty: 'Aún no hay solicitudes.', status: 'Estado', priority: 'Prioridad', created: 'Creada', actions: 'Acciones', save: 'Guardar', cancel: 'Cancelar', edit: 'Editar', delete: 'Eliminar', Low: 'Baja', Medium: 'Media', High: 'Alta', Urgent: 'Urgente', Draft: 'Borrador', Submitted: 'Enviada', Under_review: 'En revisión', Approved: 'Aprobada', Rejected: 'Rechazada', In_Progress: 'En progreso', Completed: 'Completada' },
    de: { title: 'Meine Anfragen', requestTitle: 'Anfragetitel', description: 'Beschreibung', newRequest: 'Neue Anfrage', empty: 'Noch keine Anfragen.', status: 'Status', priority: 'Priorität', created: 'Erstellt', actions: 'Aktionen', save: 'Speichern', cancel: 'Abbrechen', edit: 'Bearbeiten', delete: 'Löschen', Low: 'Niedrig', Medium: 'Mittel', High: 'Hoch', Urgent: 'Dringend', Draft: 'Entwurf', Submitted: 'Eingereicht', Under_review: 'In Prüfung', Approved: 'Genehmigt', Rejected: 'Abgelehnt', In_Progress: 'In Bearbeitung', Completed: 'Abgeschlossen' }
  };
  const locales: Record<string, string> = { en: 'en-US', ar: 'ar', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };
  let text = $derived(translations[data.language] || translations.en);
  let locale = $derived(locales[data.language] || 'en-US');
  let canManageRequests = $derived(data.user.isHost || data.user.role === 'Admin');
  let availableDepartments = $derived(
    canManageRequests
      ? data.departments.filter((department: { id: string; is_active: boolean }) => department.is_active)
      : data.departments.filter((department: { id: string; is_active: boolean }) => department.id === data.user.departmentId)
  );
</script>

<svelte:head>
  <title>{text.title}</title>
</svelte:head>

<div class="page">
  <h1>{text.title}</h1>
  
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <!-- Create form -->
  <form method="POST" action="?/create" use:enhance class="create-form">
    <input type="text" name="title" placeholder={text.requestTitle} required />
    <input type="text" name="description" placeholder={text.description} />
    <select name="departmentId" required>
      {#each availableDepartments as department}
        <option value={department.id}>{department.name}</option>
      {/each}
    </select>
    <button type="submit">{text.newRequest}</button>
  </form>

  {#if data.requests.length === 0}
    <p class="empty">{text.empty}</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{text.requestTitle}</th>
          <th>{text.status}</th>
          <th>{text.priority}</th>
          <th>{text.created}</th>
          {#if canManageRequests}<th>{text.actions}</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each data.requests as req (req.id)}
          <tr>
            {#if editingId === req.id}
              <!-- EDIT MODE: Entire row is wrapped inside a single form element -->
              <td colspan={canManageRequests ? 5 : 4}>
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
                  
                  <input type="text" name="description" value={req.description ?? ''} placeholder={text.description} class="edit-input" />

                  <select name="priority" value={req.priority} class="edit-select">
                    {#each priorities as level}
                      <option value={level}>{text[level]}</option>
                    {/each}
                  </select>

                  <div class="edit-buttons">
                    <button type="submit">{text.save}</button>
                    <button type="button" onclick={() => (editingId = null)} class="cancel-btn">{text.cancel}</button>
                  </div>
                </form>
              </td>
            {:else}
              <!-- VIEW MODE -->
              <td>{req.title}</td>
              <td><span class="badge">{text[req.status] || req.status}</span></td>
              <td><span class="priority-text">{text[req.priority] || req.priority}</span></td>
              <td>{new Date(req.created_at).toLocaleDateString(locale)}</td>
              {#if canManageRequests}
                <td class="actions">
                  <button onclick={() => (editingId = req.id)}>{text.edit}</button>
                  <form method="POST" action="?/delete" use:enhance style="display: inline">
                    <input type="hidden" name="id" value={req.id} />
                    <button type="submit">{text.delete}</button>
                  </form>
                </td>
              {/if}
            {/if}
          </tr>
          <tr class="comments-row">
            <td colspan={canManageRequests ? 5 : 4}>
              <section class="comments">
                <h2>Comments</h2>
                {#if req.comments.length > 0}
                  <ul>
                    {#each req.comments as comment (comment.id)}
                      <li><strong>{comment.author_name}</strong>: {comment.content}</li>
                    {/each}
                  </ul>
                {/if}
                <form method="POST" action="?/addComment" use:enhance class="comment-form">
                  <input type="hidden" name="id" value={req.id} />
                  <input name="content" required placeholder="Add a comment" aria-label="Add a comment" />
                  <button type="submit">Comment</button>
                </form>
              </section>
            </td>
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

  .comments-row td {
    background: #faf9f8;
  }

  .comments h2 {
    margin: 0 0 .5rem;
    font-size: .95rem;
    color: rgb(100, 95, 89);
  }

  .comments ul {
    list-style: none;
    padding: 0;
    margin: 0 0 .6rem;
  }

  .comments li {
    margin: .25rem 0;
  }

  .comment-form {
    display: flex;
    gap: .5rem;
  }

  .comment-form input {
    flex: 1;
    padding: .35rem .5rem;
    border: 1px solid rgb(100, 95, 89);
    border-radius: 4px;
  }

  .comment-form button {
    padding: .35rem .7rem;
    background: rgb(100, 95, 89);
    color: white;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
