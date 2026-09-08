import express from 'express';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import notificationsRoutes from './routes/notifications.js';
import requestsRoutes from './routes/requests.js';
import tenantsRoutes from './routes/tenants.js';
import usersRoutes from './routes/users.js';
import { departments, memberships } from './routes/organization.js';

const app = express();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/tenants', tenantsRoutes);
app.use('/departments', departments);
app.use('/memberships', memberships);
app.use('/requests', requestsRoutes);
app.use('/notifications', notificationsRoutes);

async function start() {
  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'ar', 'fr', 'es', 'de'))"
  );
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT');
  await pool.query('ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true');
  await pool.query(
    `INSERT INTO departments (tenant_id, name)
     SELECT tenants.id, 'General' FROM tenants
     WHERE NOT EXISTS (
       SELECT 1 FROM departments
       WHERE departments.tenant_id = tenants.id AND departments.name = 'General'
     )`
  );
  await pool.query(
    `UPDATE memberships AS membership
     SET department_id = department.id
     FROM departments AS department
     WHERE membership.department_id IS NULL
       AND department.tenant_id = membership.tenant_id
       AND department.name = 'General'`
  );

  https.createServer(
    {
      key: fs.readFileSync(path.resolve('certs/localhost-key.pem')),
      cert: fs.readFileSync(path.resolve('certs/localhost.pem'))
    },
    app
  ).listen(3001, () => console.log('API running on https://localhost:3001'));
}

start().catch((error) => {
  console.error('Could not start API:', error);
  process.exit(1);
});
