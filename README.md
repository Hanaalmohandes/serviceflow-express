# ServiceFlow Express

ServiceFlow is an HTTPS Express API with a SvelteKit frontend. This repository uses **pnpm only**; do not use `npm install` or create `package-lock.json` files.

## Prerequisites

- Node.js 22 or later
- pnpm 11 (`corepack enable` installs the version pinned by this repository)
- Docker Desktop and Docker Compose
- OpenSSL for the local HTTPS certificate

## Start from a fresh clone

```bash
git clone https://github.com/Hanaalmohandes/serviceflow-express.git
cd serviceflow-express
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
```

Edit `.env` and replace both JWT secrets. Do not commit this file.

Create a development-only TLS certificate. The key is intentionally ignored by Git:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365 -subj "/CN=localhost"
```

Initialize the database after Postgres becomes healthy:

```bash
psql "postgresql://postgres:hana@localhost:5433/serviceflow_express" -f schema.sql
```

Start the API and frontend in separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:frontend
```

Open [https://localhost:5173](https://localhost:5173). The API health endpoint is [https://localhost:3001/health](https://localhost:3001/health).

## Validation

```bash
pnpm check
pnpm --dir frontend check
pnpm build:frontend
```

## Package management

`pnpm-lock.yaml` is the single dependency lockfile. If dependencies change, run `pnpm install` from the repository root and commit the updated pnpm lockfile. Never run `npm install` in the root or `frontend` directory.
