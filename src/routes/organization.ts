import { Router } from 'express';
import { pool } from '../db.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { isAllowed } from '../authorization.js';
import { readCache, privateReadCache } from '../cache.js';
import { validateDepartmentName } from '../validation.js';

function canManageOrganization(user: ReturnType<typeof getAuthUser>) {
  return isAllowed(user, 'department:manage');
}

const departments = Router();
departments.use(requireAuth);

departments.get('/', async (req, res) => {
  const user = getAuthUser(req);
  privateReadCache(res);
  const cacheKey = user.isHost ? 'departments:all' : `departments:${user.tenantId}`;
  const rows = await readCache.getOrSet(cacheKey, 30_000, async () => {
    const result = user.isHost
      ? await pool.query(
        `SELECT departments.*, tenants.name AS tenant_name
         FROM departments JOIN tenants ON tenants.id = departments.tenant_id
         ORDER BY tenants.name, departments.name`
      )
      : await pool.query(
        'SELECT * FROM departments WHERE tenant_id = $1 ORDER BY name',
        [user.tenantId]
      );
    return result.rows;
  });
  res.json(rows);
});

departments.post('/', async (req, res) => {
  const user = getAuthUser(req);
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  if (!canManageOrganization(user)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const validation = validateDepartmentName(req.body.name);
  if (!tenantId || 'error' in validation) {
    res.status(400).json('error' in validation ? validation : { error: 'Organization is required.' });
    return;
  }
  try {
    const result = await pool.query(
      'INSERT INTO departments (tenant_id, name) VALUES ($1, $2) RETURNING *',
      [tenantId, validation.value]
    );
    readCache.invalidate('departments:');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

departments.patch('/:id', async (req, res) => {
  const user = getAuthUser(req);
  if (!canManageOrganization(user)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const existing = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }
  if (!user.isHost && existing.rows[0].tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { name, isActive } = req.body;
  const validation = typeof name === 'undefined' ? null : validateDepartmentName(name);
  if (validation && 'error' in validation) { res.status(400).json(validation); return; }
  const result = await pool.query(
    `UPDATE departments
     SET name = COALESCE($1, name), is_active = COALESCE($2, is_active)
     WHERE id = $3 RETURNING *`,
    [validation && 'value' in validation ? validation.value : null, typeof isActive === 'boolean' ? isActive : null, req.params.id]
  );
  readCache.invalidate('departments:');
  res.json(result.rows[0]);
});

const memberships = Router();
memberships.use(requireAuth);

memberships.post('/', async (req, res) => {
  const user = getAuthUser(req);
  if (!canManageOrganization(user)) { res.status(403).json({ error: 'Admin access required' }); return; }
  const { userId, departmentId, role, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO memberships (user_id, tenant_id, department_id, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, user.isHost ? req.body.tenantId : user.tenantId, departmentId ?? null, role, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

memberships.get('/', async (req, res) => {
  const user = getAuthUser(req);
  const result = user.isHost ? await pool.query('SELECT * FROM memberships') : await pool.query('SELECT * FROM memberships WHERE tenant_id = $1', [user.tenantId]);
  res.json(result.rows);
});

memberships.patch('/:id', async (req, res) => {
  const user = getAuthUser(req);
  const existing = await pool.query('SELECT * FROM memberships WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) { res.status(404).json({ error: 'Not found' }); return; }
  const membership = existing.rows[0];
  if (!canManageOrganization(user) || (!user.isHost && membership.tenant_id !== user.tenantId)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const { role, status, departmentId } = req.body;
  if (departmentId) {
    const department = await pool.query('SELECT id FROM departments WHERE id = $1 AND tenant_id = $2', [departmentId, membership.tenant_id]);
    if (!department.rows.length) { res.status(400).json({ error: 'Department does not belong to this organization' }); return; }
  }
  const result = await pool.query(
    'UPDATE memberships SET role = COALESCE($1, role), status = COALESCE($2, status), department_id = COALESCE($3, department_id) WHERE id = $4 RETURNING *',
    [role ?? null, status ?? null, departmentId ?? null, req.params.id]
  );
  res.json(result.rows[0]);
});

export { departments, memberships };
