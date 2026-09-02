import express, { Express, NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { signToken, verifyToken, hashPassword, comparePassword } from './auth.js';

const app: Express = express();

app.use(express.json());

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  const token = header.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireHost(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.isHost) {
    res.status(403).json({ error: 'Host access required' });
    return;
  }
  next();
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/auth/register', async (req: Request, res: Response) => {
  const { email, name, password, tenantName, tenantSlug } = req.body;
  if (!email || !name || !password || !tenantName || !tenantSlug) {
    res.status(400).json({ error: 'Name, email, password, tenant name, and tenant slug are required' });
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
    const user = userResult.rows[0];
    const tenantResult = await client.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *',
      [tenantName, tenantSlug]
    );
    const tenant = tenantResult.rows[0];
    await client.query(
      `INSERT INTO memberships (user_id, tenant_id, role, status)
       VALUES ($1, $2, 'Admin', 'Active')`,
      [user.id, tenant.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ user, tenant });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'That email address or tenant slug is already in use' });
      return;
    }
    res.status(500).json({ error: 'Could not create account' });
  } finally {
    client.release();
  }
});

app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user = userResult.rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.is_host) {
      const token = signToken({ userId: user.id, isHost: true });
      res.json({ token, isHost: true });
      return;
    }

    const membershipResult = await pool.query(
      'SELECT * FROM memberships WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    if (membershipResult.rows.length === 0) {
      res.status(403).json({ error: 'No tenant membership found' });
      return;
    }
    const membership = membershipResult.rows[0];
    const token = signToken({
      userId: user.id,
      isHost: false,
      tenantId: membership.tenant_id,
      role: membership.role,
    });
    res.json({ token, isHost: false, tenantId: membership.tenant_id, role: membership.role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tenants', requireAuth, requireHost, async (req: Request, res: Response) => {
  const { name, slug } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/tenants/:id', requireAuth, requireHost, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, isActive } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tenants SET name = COALESCE($1, name), slug = COALESCE($2, slug), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *`,
      [name ?? null, slug ?? null, isActive ?? null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/tenants/:id', requireAuth, requireHost, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tenants', requireAuth, requireHost, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM tenants');
  res.json(result.rows);
});

app.get('/users', requireAuth, requireHost, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT id, email, name, is_host, created_at FROM users');
  res.json(result.rows);
});

app.post('/departments', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.body;
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  try {
    const result = await pool.query(
      'INSERT INTO departments (tenant_id, name) VALUES ($1, $2) RETURNING *',
      [tenantId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/departments', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.isHost) {
    const result = await pool.query('SELECT * FROM departments');
    res.json(result.rows);
    return;
  }
  const result = await pool.query('SELECT * FROM departments WHERE tenant_id = $1', [user.tenantId]);
  res.json(result.rows);
});

app.post('/memberships', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user.isHost && user.role !== 'Admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const { userId, departmentId, role, status } = req.body;
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  try {
    const result = await pool.query(
      `INSERT INTO memberships (user_id, tenant_id, department_id, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, tenantId, departmentId ?? null, role, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/memberships/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM memberships WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const membership = existing.rows[0];

  if (!user.isHost) {
    if (user.role !== 'Admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    if (membership.tenant_id !== user.tenantId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

  const { role, status, departmentId } = req.body;
  const result = await pool.query(
    `UPDATE memberships SET role = COALESCE($1, role), status = COALESCE($2, status), department_id = COALESCE($3, department_id) WHERE id = $4 RETURNING *`,
    [role ?? null, status ?? null, departmentId ?? null, id]
  );
  res.json(result.rows[0]);
});

app.get('/memberships', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.isHost) {
    const result = await pool.query('SELECT * FROM memberships');
    res.json(result.rows);
    return;
  }
  const result = await pool.query('SELECT * FROM memberships WHERE tenant_id = $1', [user.tenantId]);
  res.json(result.rows);
});

app.post('/requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, description, departmentId } = req.body;
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  const creatorId = user.isHost ? req.body.creatorId : user.userId;
  try {
    const result = await pool.query(
      `INSERT INTO requests (tenant_id, department_id, title, description, creator_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, departmentId ?? null, title, description ?? null, creatorId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/requests', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.isHost) {
    const result = await pool.query('SELECT * FROM requests');
    res.json(result.rows);
    return;
  }
  const result = await pool.query('SELECT * FROM requests WHERE tenant_id = $1', [user.tenantId]);
  res.json(result.rows);
});

app.get('/requests/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const request = result.rows[0];
  if (!user.isHost && request.tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.json(request);
});

app.patch('/requests/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const request = existing.rows[0];

  if (!user.isHost && request.tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { title, description, priority } = req.body;
  const result = await pool.query(
    `UPDATE requests SET title = COALESCE($1, title), description = COALESCE($2, description), priority = COALESCE($3, priority) WHERE id = $4 RETURNING *`,
    [title ?? null, description ?? null, priority ?? null, id]
  );
  res.json(result.rows[0]);
});

app.delete('/requests/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const request = existing.rows[0];

  if (!user.isHost && request.tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await pool.query('DELETE FROM requests WHERE id = $1', [id]);
  res.status(204).send();
});

app.patch('/requests/:id/status', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { status } = req.body;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const current = existing.rows[0];

  if (!user.isHost && current.tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const updated = await pool.query(
      'UPDATE requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    await pool.query(
      `INSERT INTO status_history (request_id, changed_by, old_status, new_status)
       VALUES ($1, $2, $3, $4)`,
      [id, user.userId, current.status, status]
    );

    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/requests/:id/history', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!user.isHost && existing.rows[0].tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await pool.query(
    'SELECT * FROM status_history WHERE request_id = $1 ORDER BY created_at',
    [id]
  );
  res.json(result.rows);
});

app.post('/requests/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { content, parentId } = req.body;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!user.isHost && existing.rows[0].tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO comments (request_id, author_id, content, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, user.userId, content, parentId ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/requests/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!user.isHost && existing.rows[0].tenant_id !== user.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await pool.query(
    'SELECT * FROM comments WHERE request_id = $1 ORDER BY created_at',
    [id]
  );
  res.json(result.rows);
});

app.post('/notifications', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { requestId, type } = req.body;
  const targetUserId = req.body.userId ?? user.userId;
  const tenantId = user.isHost ? req.body.tenantId : user.tenantId;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, tenant_id, request_id, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [targetUserId, tenantId, requestId ?? null, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.isHost) {
    const result = await pool.query('SELECT * FROM notifications');
    res.json(result.rows);
    return;
  }
  const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1', [user.userId]);
  res.json(result.rows);
});

const port = 3001;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
