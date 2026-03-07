# VPS Deployment Reference (SchoolLive)

Last verified: 2026-03-07 (via `ssh vps-ovh`)
Server hostname: `vps-0e0e21b7`
Main user: `ubuntu`

## Purpose

Operational source of truth for how deployment is organized on the VPS.
Read this file before any VPS/deploy action.

## Filesystem layout

- App root (SchoolLive): `/home/ubuntu/apps/scolive`
- Infra root: `/home/ubuntu/infra`
- Shared uploads root used by SchoolLive: `/home/ubuntu/uploads/scolive`

Main folders:

- `/home/ubuntu/apps`
  - `scolive`
  - `smc`
  - `taxi-tignieu-charvieu`
- `/home/ubuntu/infra`
  - `nginx`
  - `db/postgres`
  - `db/mysql`

## SchoolLive runtime (Docker Compose)

Compose file:

- `/home/ubuntu/apps/scolive/docker/docker-compose.vps.yml`

Services defined:

- `web` (Next.js, internal `3000`)
- `api` (NestJS, internal `3001`)
- `media` (media microservice, internal `3002`)
- `worker` (async jobs)
- `redis` (internal)
- `minio` (internal S3-compatible storage, console bound to `127.0.0.1:9001`)

External Docker networks used by SchoolLive:

- `proxy` (for nginx reverse proxy reachability)
- `db` (for Postgres reachability)

Notes:

- `UPLOADS_ROOT` is expected at `/home/ubuntu/uploads/scolive` for persistent redis/minio data.
- `docker/.env` is preserved across CI deploys and reused at runtime.

## Reverse proxy and TLS

Nginx compose:

- `/home/ubuntu/infra/nginx/docker-compose.yml`

Nginx vhost for SchoolLive:

- `/home/ubuntu/infra/nginx/conf.d/scolive.lisaweb.fr.conf`

Routing behavior for `scolive.lisaweb.fr`:

- `/api/auth/(sso/login|login|login-phone|refresh|logout)` -> `api:3001`
- `/api/auth/(providers|session|csrf|signin*|signout*|callback*)` -> `web:3000`
- `/api/*` -> `api:3001`
- `/media/*` -> `media:3002`
- everything else `/` -> `web:3000`

TLS:

- Certificates via certbot volume in `/home/ubuntu/infra/nginx/certbot/conf`
- Renewal via user crontab at `03:00` daily:
  - runs certbot renewal
  - reloads nginx afterward

## Databases (central infra)

Postgres compose:

- `/home/ubuntu/infra/db/postgres/docker-compose.yml`
- Container: `postgres-central`
- Network: `db`

MySQL compose:

- `/home/ubuntu/infra/db/mysql/docker-compose.yml`
- Container: `mysql-central`
- Network: `proxy`

## CI/CD deployment flow (main branch)

Workflow file in repo:

- `.github/workflows/deploy-vps.yml`

Observed flow:

1. CI checks (lint/typecheck/tests/build) on push/PR.
2. On push to `main`, CI creates a release tarball.
3. Tarball uploaded to VPS under `~/apps`.
4. Remote deploy script:
   - preserves existing `~/apps/scolive/docker/.env`,
   - wipes app directory content,
   - extracts new release,
   - restores `docker/.env`,
   - ensures `db` and `proxy` docker networks,
   - runs:
     - `docker compose -f docker/docker-compose.vps.yml --env-file docker/.env up -d --build`
   - runs Prisma migrations inside API container:
     - `npm run db:schema:gen && npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`

Important:

- On VPS, `~/apps/scolive` is a deployed copy (no `.git` metadata expected).

## Compose project anchors (verified from container labels)

- SchoolLive project:
  - working dir: `/home/ubuntu/apps/scolive/docker`
  - config file: `/home/ubuntu/apps/scolive/docker/docker-compose.vps.yml`
- Nginx project:
  - working dir: `/home/ubuntu/infra/nginx`
  - config file: `/home/ubuntu/infra/nginx/docker-compose.yml`
- Postgres project:
  - working dir: `/home/ubuntu/infra/db/postgres`
  - config file: `/home/ubuntu/infra/db/postgres/docker-compose.yml`
- MySQL project:
  - working dir: `/home/ubuntu/infra/db/mysql`
  - config file: `/home/ubuntu/infra/db/mysql/docker-compose.yml`

## Operations quick commands

SchoolLive:

```bash
cd /home/ubuntu/apps/scolive
UPLOADS_ROOT=/home/ubuntu/uploads/scolive NGINX_NETWORK=proxy \
docker compose -f docker/docker-compose.vps.yml --env-file docker/.env ps
```

Rebuild/restart SchoolLive:

```bash
cd /home/ubuntu/apps/scolive
UPLOADS_ROOT=/home/ubuntu/uploads/scolive NGINX_NETWORK=proxy \
docker compose -f docker/docker-compose.vps.yml --env-file docker/.env up -d --build
```

Nginx:

```bash
cd /home/ubuntu/infra/nginx
docker compose ps
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

## Security note

- Never store raw secrets in this document.
- If credentials rotate or topology changes, update this file immediately.
