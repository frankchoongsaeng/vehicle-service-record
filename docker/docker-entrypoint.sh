#!/bin/sh
set -eu

max_attempts="${DB_MIGRATE_MAX_ATTEMPTS:-30}"
attempt=1
baseline_attempted=false

database_provider="${DATABASE_PROVIDER:-}"

if [ -z "$database_provider" ]; then
    case "${DATABASE_URL:-}" in
        mysql:*)
            database_provider="mysql"
            ;;
        *)
            database_provider="sqlite"
            ;;
    esac
fi

case "$database_provider" in
    mysql)
        migrations_dir="prisma/mysql/migrations"
        ;;
    *)
        migrations_dir="prisma/migrations"
        ;;
esac

resolve_baseline_migration() {
    baseline_migration="$(find "$migrations_dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | head -n 1)"

    if [ -z "$baseline_migration" ]; then
        echo "Prisma reported P3005 but no migration directory was found in $migrations_dir"
        return 1
    fi

    echo "Prisma reported P3005 for a non-empty schema. Marking baseline migration ${baseline_migration} as applied."
    npx prisma migrate resolve --applied "$baseline_migration"
}

echo "Generating Prisma client for ${DATABASE_PROVIDER:-inferred}"
npm run db:generate

while true; do
    output_file="$(mktemp)"

    if npm run db:deploy >"$output_file" 2>&1; then
        cat "$output_file"
        rm -f "$output_file"
        break
    fi

    cat "$output_file"

    if grep -q 'Error: P3005' "$output_file"; then
        rm -f "$output_file"

        if [ "${PRISMA_BASELINE_ON_P3005:-true}" != "true" ]; then
            echo "Prisma reported P3005 and automatic baselining is disabled."
            exit 1
        fi

        if [ "$baseline_attempted" = "true" ]; then
            echo "Prisma reported P3005 again after automatic baseline resolution."
            exit 1
        fi

        baseline_attempted=true
        resolve_baseline_migration
        continue
    fi

    rm -f "$output_file"

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
