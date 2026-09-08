import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../db.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
async function findAuthorizedRequest(
  id: string,
  req: Request,
  res: Response,
  requireAdmin = false
) {
  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  const user = getAuthUser(req);
  if (!user.isHost && existing.rows[0].tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  if (!user.isHost && user.role !== 'Admin' && existing.rows[0].department_id !== user.departmentId) {
    res.status(403).json({ error: 'This request belongs to another department' });
    return null;
  }
  if (requireAdmin && !user.isHost && user.role !== 'Admin') {
    res.status(403).json({ error: 'Admin access required to modify requests' });
    return null;
  }
  return existing.rows[0];
}
router.post('/', async (req, res) => {
  const user = getAuthUser(req);
  const { title, description } = req.body;
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  const departmentId = req.body.departmentId ?? user.departmentId;
  if (!tenantId || !departmentId) { res.status(400).json({ error: 'A department is required' }); return; }
  if (!user.isHost && user.role !== 'Admin' && departmentId !== user.departmentId) {
    res.status(403).json({ error: 'Regular users can only create requests for their department' });
    return;
  }
  const department = await pool.query('SELECT id FROM departments WHERE id = $1 AND tenant_id = $2 AND is_active = true', [departmentId, tenantId]);
  if (!department.rows.length) { res.status(400).json({ error: 'Choose an active department in your organization' }); return; }
  try {
    const result = await pool.query(
      'INSERT INTO requests (tenant_id, department_id, title, description, creator_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tenantId, departmentId, title, description ?? null, user.isHost ? req.body.creatorId : user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/', async (req, res) => {
  const user = getAuthUser(req);
  const result = user.isHost
    ? await pool.query('SELECT * FROM requests')
    : user.role === 'Admin'
      ? await pool.query('SELECT * FROM requests WHERE tenant_id = $1', [user.tenantId])
      : await pool.query('SELECT * FROM requests WHERE tenant_id = $1 AND department_id = $2', [user.tenantId, user.departmentId]);
  res.json(result.rows);
});
router.get('/:id', async (req, res) => { const request = await findAuthorizedRequest(req.params.id, req, res); if (request) res.json(request); });
router.patch('/:id', async (req, res) => { if (!await findAuthorizedRequest(req.params.id, req, res, true)) return; const { title, description, priority } = req.body; const result = await pool.query('UPDATE requests SET title = COALESCE($1, title), description = COALESCE($2, description), priority = COALESCE($3, priority) WHERE id = $4 RETURNING *', [title ?? null, description ?? null, priority ?? null, req.params.id]); res.json(result.rows[0]); });
router.delete('/:id', async (req, res) => { if (!await findAuthorizedRequest(req.params.id, req, res, true)) return; const client = await pool.connect(); try { await client.query('BEGIN'); await client.query('DELETE FROM status_history WHERE request_id = $1', [req.params.id]); await client.query('DELETE FROM comments WHERE request_id = $1', [req.params.id]); await client.query('UPDATE notifications SET request_id = NULL WHERE request_id = $1', [req.params.id]); const deleted = await client.query('DELETE FROM requests WHERE id = $1 RETURNING id', [req.params.id]); await client.query('COMMIT'); if (!deleted.rows.length) { res.status(404).json({ error: 'Not found' }); return; } res.status(204).send(); } catch { await client.query('ROLLBACK'); res.status(500).json({ error: 'Could not delete request' }); } finally { client.release(); } });
router.patch('/:id/status', async (req, res) => { const current = await findAuthorizedRequest(req.params.id, req, res, true); if (!current) return; try { const updated = await pool.query('UPDATE requests SET status = $1 WHERE id = $2 RETURNING *', [req.body.status, req.params.id]); await pool.query('INSERT INTO status_history (request_id, changed_by, old_status, new_status) VALUES ($1, $2, $3, $4)', [req.params.id, getAuthUser(req).userId, current.status, req.body.status]); res.json(updated.rows[0]); } catch (error: any) { res.status(500).json({ error: error.message }); } });
router.get('/:id/history', async (req, res) => { if (!await findAuthorizedRequest(req.params.id, req, res)) return; const result = await pool.query('SELECT * FROM status_history WHERE request_id = $1 ORDER BY created_at', [req.params.id]); res.json(result.rows); });
router.post('/:id/comments', async (req, res) => {
  const request = await findAuthorizedRequest(req.params.id, req, res);
  const { content, parentId } = req.body;
  if (!request) return;
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Comment content is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const comment = await client.query(
      'INSERT INTO comments (request_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, getAuthUser(req).userId, content.trim(), parentId ?? null]
    );
    await client.query(
      `INSERT INTO notifications (user_id, tenant_id, request_id, type, message)
       SELECT user_id, $1, $2, 'Mention', $3
       FROM memberships
       WHERE tenant_id = $1 AND status = 'Active'`,
      [request.tenant_id, req.params.id, `New comment on request: ${request.title}`]
    );
    await client.query('COMMIT');
    res.status(201).json(comment.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Could not add comment' });
  } finally {
    client.release();
  }
});
router.get('/:id/comments', async (req, res) => {
  if (!await findAuthorizedRequest(req.params.id, req, res)) return;
  const result = await pool.query(
    `SELECT comments.*, users.name AS author_name
     FROM comments JOIN users ON users.id = comments.author_id
     WHERE request_id = $1 ORDER BY comments.created_at`,
    [req.params.id]
  );
  res.json(result.rows);
});
export default router;
