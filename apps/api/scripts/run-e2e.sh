#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-../../docker/docker-compose.dev.yml}"
TEST_DB_NAME="${TEST_DB_NAME:-school_live_test}"
TEST_DB_USER="${TEST_DB_USER:-school}"
TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-school}"
TEST_DB_HOST="${TEST_DB_HOST:-127.0.0.1}"
TEST_DB_PORT="${TEST_DB_PORT:-5432}"

if [ -f ".env.test" ]; then
  set -a
  . ./.env.test
  set +a
fi

DATABASE_URL="${DATABASE_URL:-postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}?schema=public}"

echo "==> Starting postgres + redis containers for e2e"
docker compose -f "${COMPOSE_FILE}" up -d postgres redis

echo "==> Waiting for postgres readiness"
docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -lc "until pg_isready -U '${TEST_DB_USER}' -d postgres >/dev/null 2>&1; do sleep 1; done"

echo "==> Waiting for redis readiness"
docker compose -f "${COMPOSE_FILE}" exec -T redis sh -lc "until redis-cli ping >/dev/null 2>&1; do sleep 1; done"

echo "==> Ensuring test database '${TEST_DB_NAME}' exists"
docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -lc "psql -U '${TEST_DB_USER}' -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='${TEST_DB_NAME}'\" | grep -q 1 || psql -U '${TEST_DB_USER}' -d postgres -c \"CREATE DATABASE \\\"${TEST_DB_NAME}\\\"\""

echo "==> Applying prisma migrations on test database"
NODE_ENV=test DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy --schema prisma/schema.prisma

echo "==> Running e2e tests"
NODE_ENV=test DATABASE_URL="${DATABASE_URL}" jest --config ./jest.e2e.config.cjs --runInBand "$@"
