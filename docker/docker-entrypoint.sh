#!/bin/sh
set -eu

max_attempts="${DB_MIGRATE_MAX_ATTEMPTS:-30}"
attempt=1

echo "Generating Prisma client for ${DATABASE_PROVIDER:-inferred}"
npm run db:generate

until npm run db:deploy; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Prisma migration deployment failed after ${max_attempts} attempts"
        exit 1
    fi

    echo "Database is not ready for migrations yet; retrying (${attempt}/${max_attempts})"
    attempt=$((attempt + 1))
    sleep 2
done

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
    echo "Seeding database"
    npm run db:seed
fi

exec "$@"
