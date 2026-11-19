#!/bin/sh
set -e
echo "Applying database schema..."
npx prisma db push --skip-generate
echo "Seeding demo data..."
node prisma/seed.js || echo "Seed skipped/failed (continuing)"
echo "Starting API..."
exec node dist/src/main.js
