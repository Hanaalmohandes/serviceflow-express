-- ServiceFlow schema, written by hand in raw SQL (no ORM).
-- Run this once against a fresh database to create every table.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pgcrypto gives us gen_random_uuid(), used below as the default for every id column.

CREATE TYPE role AS ENUM ('Admin', 'Manager', 'Reviewer', 'Employee');
CREATE TYPE membership_status AS ENUM ('Active', 'Invited', 'Suspended');
CREATE TYPE request_status AS ENUM ('Draft', 'Submitted', 'Under_review', 'Approved', 'Rejected', 'In_Progress', 'Completed');
CREATE TYPE priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
CREATE TYPE notification_type AS ENUM ('Status_Update', 'Assigned', 'Mention');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  department_id UUID REFERENCES departments(id),
  role role NOT NULL DEFAULT 'Employee',
  status membership_status NOT NULL DEFAULT 'Invited'
);

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  department_id UUID REFERENCES departments(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status request_status NOT NULL DEFAULT 'Draft',
  priority priority NOT NULL DEFAULT 'Medium',
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id),
  changed_by UUID NOT NULL REFERENCES users(id),
  old_status request_status NOT NULL,
  new_status request_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id),
  author_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  request_id UUID REFERENCES requests(id),
  type notification_type NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
