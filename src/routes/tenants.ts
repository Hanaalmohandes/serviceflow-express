import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireHost } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireHost);

router.post('/', async (req, res) => {
  try { const result = await pool.query('INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.slug]); res.status(201).json(result.rows[0]); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/', async (_req, res) => { const result = await pool.query('SELECT * FROM tenants'); res.json(result.rows); });
router.patch('/:id', async (req, res) => {
  try {
    const { name, slug, isActive } = req.body;
    const result = await pool.query('UPDATE tenants SET name = COALESCE($1, name), slug = COALESCE($2, slug), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *', [name ?? null, slug ?? null, isActive ?? null, req.params.id]);
    if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; } res.json(result.rows[0]);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.delete('/:id', async (req, res) => {
  try { const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [req.params.id]); if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; } res.status(204).send(); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
