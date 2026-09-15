import { Router } from 'express';
import { pool } from '../db.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { isAllowed } from '../authorization.js';
const router = Router(); router.use(requireAuth);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/', async (req, res) => { const user = getAuthUser(req); try { const result = await pool.query('INSERT INTO notifications (user_id, tenant_id, request_id, type) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.userId ?? user.userId, user.isHost ? req.body.tenantId : user.tenantId, req.body.requestId ?? null, req.body.type]); res.status(201).json(result.rows[0]); } catch (error: any) { res.status(500).json({ error: error.message }); } });
router.get('/', async (req, res) => {
  const user = getAuthUser(req);
  if (!isAllowed(user, 'notification:read')) { res.status(403).json({ error: 'Notification access required' }); return; }
  const result = user.isHost
    ? await pool.query(
        'SELECT notifications.*, requests.title AS request_title FROM notifications LEFT JOIN requests ON requests.id = notifications.request_id ORDER BY notifications.created_at DESC'
      )
    : await pool.query(
        'SELECT notifications.*, requests.title AS request_title FROM notifications LEFT JOIN requests ON requests.id = notifications.request_id WHERE notifications.tenant_id = $1 ORDER BY notifications.created_at DESC',
        [user.tenantId]
      );
  res.json(result.rows);
});
export default router;
