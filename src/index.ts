import express, { Express, NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { signToken, verifyToken, hashPassword, comparePassword } from './auth.js';
const app: Express = express();

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/tenants', async (req: Request, res: Response) => {
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

app.get('/tenants', requireAuth, requireHost, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM tenants');
  res.json(result.rows);
});

app.post('/users', async (req: Request, res: Response) => {
  const { email, name, passwordHash } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [email, name, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
});

app.post('/departments', async (req: Request, res: Response) => {
  const { tenantId, name } = req.body;
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

app.get('/departments', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM departments');
  res.json(result.rows);
});

app.post('/memberships', async (req: Request, res: Response) => {
  const { userId, tenantId, departmentId, role, status } = req.body;
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

app.get('/memberships', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM memberships');
  res.json(result.rows);
});

app.post('/requests', async (req: Request, res: Response) => {
  const { tenantId, departmentId, title, description, creatorId } = req.body;
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

app.get('/requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

app.post('/requests/:id/submit', async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const current = existing.rows[0];

  const updated = await pool.query(
    `UPDATE requests SET status = 'Submitted', submitted_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );

  await pool.query(
    `INSERT INTO status_history (request_id, changed_by, old_status, new_status)
     VALUES ($1, $2, $3, $4)`,
    [id, current.creator_id, current.status, 'Submitted']
  );

  res.json(updated.rows[0]);
});

app.get('/requests/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM status_history WHERE request_id = $1 ORDER BY created_at',
    [id]
  );
  res.json(result.rows);
});

app.post('/requests/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { authorId, content, parentId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO comments (request_id, author_id, content, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, authorId, content, parentId ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/requests/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM comments WHERE request_id = $1', [id]);
  res.json(result.rows);
});

app.post('/notifications', async (req: Request, res: Response) => {
  const { userId, tenantId, requestId, type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, tenant_id, request_id, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, tenantId, requestId ?? null, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM notifications');
  res.json(result.rows);
});

const port = 3001;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

app.post('/auth/register', async (req: Request, res: Response) => {
  const { email, name, password } = req.body;
  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, is_host, created_at',
      [email, name, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
