import { Router } from 'express';
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth.js';
import { pool } from '../db.js';

const router = Router();

async function issueTokens(user: { id: string; is_host: boolean; language_preference?: string }) {
  let claims: Record<string, unknown> = {
    userId: user.id,
    isHost: user.is_host,
    language: user.language_preference ?? 'en'
  };
  if (!user.is_host) {
    const membership = await pool.query(
      'SELECT tenant_id, department_id, role FROM memberships WHERE user_id = $1 AND status = $2 LIMIT 1',
      [user.id, 'Active']
    );
    if (!membership.rows.length) {
      const error = new Error('No active tenant membership found') as Error & { status: number };
      error.status = 403;
      throw error;
    }
    claims = { ...claims, tenantId: membership.rows[0].tenant_id, departmentId: membership.rows[0].department_id, role: membership.rows[0].role };
  }
  return { ...claims, accessToken: signAccessToken(claims), refreshToken: signRefreshToken({ userId: user.id }) };
}

router.post('/register', async (req, res) => {
  const { email, name, password, tenantName, tenantSlug } = req.body;
  if (!email || !name || !password || !tenantSlug) {
    res.status(400).json({ error: 'Name, email, password, and organization slug are required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await hashPassword(password);
    const userResult = await client.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, is_host, created_at',
      [email, name, passwordHash]
    );
    const existingTenant = await client.query(
      'SELECT * FROM tenants WHERE slug = $1 FOR UPDATE',
      [tenantSlug]
    );
    const tenant = existingTenant.rows[0] ?? (
      !tenantName
        ? null
        : (await client.query(
            'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *',
            [tenantName, tenantSlug]
          )).rows[0]
    );

    if (!tenant) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Enter an organization name to create a new organization.' });
      return;
    }

    await client.query(
      `INSERT INTO departments (tenant_id, name)
       SELECT $1, 'General'
       WHERE NOT EXISTS (
         SELECT 1 FROM departments WHERE tenant_id = $1 AND name = 'General'
       )`,
      [tenant.id]
    );
    const department = await client.query(
      "SELECT id FROM departments WHERE tenant_id = $1 AND name = 'General' LIMIT 1",
      [tenant.id]
    );
    await client.query(
      "INSERT INTO memberships (user_id, tenant_id, department_id, role, status) VALUES ($1, $2, $3, $4, 'Active')",
      [userResult.rows[0].id, tenant.id, department.rows[0].id, existingTenant.rows.length ? 'Employee' : 'Admin']
    );
    await client.query('COMMIT');
    res.status(201).json({ user: userResult.rows[0], tenant });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'That email address or tenant slug is already in use' : 'Could not create account' });
  } finally { client.release(); }
});

router.post('/login', async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    if (!userResult.rows.length || !await comparePassword(req.body.password, userResult.rows[0].password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    res.json(await issueTokens(userResult.rows[0]));
  } catch (error: any) { res.status(error.status ?? 500).json({ error: error.message ?? 'Could not log in' }); }
});

router.post('/refresh', async (req, res) => {
  if (!req.body.refreshToken) { res.status(401).json({ error: 'Missing refresh token' }); return; }
  try {
    const decoded = verifyRefreshToken(req.body.refreshToken);
    const userResult = await pool.query('SELECT id, is_host, language_preference FROM users WHERE id = $1', [decoded.userId]);
    if (!userResult.rows.length) { res.status(401).json({ error: 'User not found' }); return; }
    res.json(await issueTokens(userResult.rows[0]));
  } catch (error: any) { res.status(error.status ?? 401).json({ error: error.status ? error.message : 'Invalid or expired refresh token' }); }
});

export default router;
