import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { privateReadCache, readCache } from '../cache.js';
import { TENANT_SLUG_PATTERN } from '../validation.js';

const router = Router();
router.use(requireAuth, requireHost);

router.post('/', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const slug = typeof req.body.slug === 'string' ? req.body.slug.trim() : '';
  if (name.length < 2 || name.length > 100 || !TENANT_SLUG_PATTERN.test(slug) || slug.length > 63) { res.status(400).json({ error: 'Enter a 2–100 character name and a lowercase organization slug.' }); return; }
  try { const result = await pool.query('INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *', [name, slug]); readCache.invalidate('tenants:'); res.status(201).json(result.rows[0]); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/', async (_req, res) => { privateReadCache(res); const rows = await readCache.getOrSet('tenants:all', 30_000, async () => (await pool.query('SELECT * FROM tenants')).rows); res.json(rows); });
router.patch('/:id', async (req, res) => {
  try {
    const { name, slug, isActive } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : null;
    const normalizedSlug = typeof slug === 'string' ? slug.trim() : null;
    if ((normalizedName !== null && (normalizedName.length < 2 || normalizedName.length > 100)) || (normalizedSlug !== null && (!TENANT_SLUG_PATTERN.test(normalizedSlug) || normalizedSlug.length > 63))) {
      res.status(400).json({ error: 'Enter a 2–100 character name and a lowercase organization slug.' }); return;
    }
    const result = await pool.query('UPDATE tenants SET name = COALESCE($1, name), slug = COALESCE($2, slug), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *', [normalizedName, normalizedSlug, typeof isActive === 'boolean' ? isActive : null, req.params.id]);
    if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; } readCache.invalidate('tenants:'); res.json(result.rows[0]);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.delete('/:id', async (req, res) => {
  try { const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [req.params.id]); if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; } readCache.invalidate('tenants:'); readCache.invalidate('departments:'); res.status(204).send(); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
