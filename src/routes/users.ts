import { Router } from 'express';
import { pool } from '../db.js';
import { getAuthUser, requireAuth, requireHost } from '../middleware/auth.js';

const router = Router();
const supportedLanguages = new Set(['en', 'ar', 'fr', 'es', 'de']);

router.get('/', requireAuth, requireHost, async (_req, res) => {
  const result = await pool.query(
    `SELECT
       users.id,
       users.email,
       users.name,
       users.is_host,
       users.created_at,
       memberships.id AS membership_id,
       memberships.tenant_id,
       memberships.department_id,
       memberships.role,
       memberships.status,
       tenants.name AS tenant_name,
       tenants.slug AS tenant_slug,
       departments.name AS department_name
     FROM users
     LEFT JOIN memberships ON memberships.user_id = users.id
     LEFT JOIN tenants ON tenants.id = memberships.tenant_id
     LEFT JOIN departments ON departments.id = memberships.department_id
     ORDER BY users.is_host DESC, users.name, tenants.name`
  );
  res.json(result.rows);
});

router.delete('/:id', requireAuth, requireHost, async (req, res) => {
  const userId = req.params.id;
  const currentUser = getAuthUser(req);

  if (userId === currentUser.userId) {
    res.status(400).json({ error: 'A Host cannot delete their own account' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      'SELECT id, is_host FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!user.rows.length) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.rows[0].is_host) {
      await client.query('ROLLBACK');
      res.status(403).json({ error: 'Host accounts cannot be deleted here' });
      return;
    }

    // Clear references before deleting comments so comment replies remain valid.
    await client.query(
      `UPDATE comments SET parent_id = NULL
       WHERE parent_id IN (
         SELECT id FROM comments
         WHERE author_id = $1
            OR request_id IN (SELECT id FROM requests WHERE creator_id = $1)
       )`,
      [userId]
    );
    await client.query(
      `DELETE FROM status_history
       WHERE changed_by = $1
          OR request_id IN (SELECT id FROM requests WHERE creator_id = $1)`,
      [userId]
    );
    await client.query(
      `UPDATE notifications SET request_id = NULL
       WHERE request_id IN (SELECT id FROM requests WHERE creator_id = $1)`,
      [userId]
    );
    await client.query(
      `DELETE FROM comments
       WHERE author_id = $1
          OR request_id IN (SELECT id FROM requests WHERE creator_id = $1)`,
      [userId]
    );
    await client.query('UPDATE requests SET reviewer_id = NULL WHERE reviewer_id = $1', [userId]);
    await client.query('DELETE FROM requests WHERE creator_id = $1', [userId]);
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM memberships WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Could not delete user' });
  } finally {
    client.release();
  }
});

router.get('/me/preferences', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT language_preference FROM users WHERE id = $1', [getAuthUser(req).userId]);
  if (!result.rows.length) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ language: result.rows[0].language_preference });
});

router.patch('/me/preferences', requireAuth, async (req, res) => {
  const { language } = req.body;
  if (typeof language !== 'string' || !supportedLanguages.has(language)) {
    res.status(400).json({ error: 'Unsupported language preference' }); return;
  }
  const result = await pool.query('UPDATE users SET language_preference = $1 WHERE id = $2 RETURNING language_preference', [language, getAuthUser(req).userId]);
  if (!result.rows.length) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ language: result.rows[0].language_preference });
});

export default router;
