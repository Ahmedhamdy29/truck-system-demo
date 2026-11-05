#!/bin/sh
# Demo entrypoint for the server container:
#   1. wait until Postgres accepts connections,
#   2. create the tables + seed company/admin (idempotent — safe to re-run),
#   3. start the Express server.
set -e

echo "Waiting for Postgres..."
node scripts/waitForDb.js

echo "Initializing database (tables + seed data)..."
node scripts/initDatabase.js

echo "Starting server..."
exec node server.js
