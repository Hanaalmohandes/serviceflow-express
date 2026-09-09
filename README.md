# ServiceFlow Express

ServiceFlow is an HTTPS Express API with a SvelteKit frontend. Use **pnpm only**; do not use `npm install` or add `package-lock.json` files.

## Setup

Requires Node.js 22+, Docker Desktop, and OpenSSL.

```bash
git clone https://github.com/Hanaalmohandes/serviceflow-express.git
cd serviceflow-express
corepack enable
cp .env.example .env
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365 -subj "/CN=localhost"
pnpm install --frozen-lockfile
docker compose up -d
psql "postgresql://postgres:hana@localhost:5433/serviceflow_express" -f schema.sql
```

Before starting, replace the JWT secrets in `.env`. The `.env` file and TLS certificate are local only and are not committed.

## Run

Use two terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:frontend
```

Open [https://localhost:5173](https://localhost:5173). The API health endpoint is [https://localhost:3001/health](https://localhost:3001/health).

## Verify

```bash
pnpm check
pnpm --dir frontend check
pnpm build:frontend
```
