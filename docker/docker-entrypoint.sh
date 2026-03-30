#!/bin/sh
set -eu

log() {
    printf '%s\n' "$*"
}

mask_database_url() {
    if [ -z "${DATABASE_URL:-}" ]; then
        printf '%s\n' '<unset>'
        return
    fi

    printf '%s\n' "$DATABASE_URL" | sed -E 's#(mysql://[^:]+:)[^@]*@#\1****@#'
}

run_migrations() {
    output_file="$(mktemp)"

    if npm run db:deploy >"$output_file" 2>&1; then
        cat "$output_file"
        rm -f "$output_file"
        return 0
    fi

    cat "$output_file"

    if grep -q 'Error: P3005' "$output_file"; then
        log 'Prisma reported P3005: the database schema is not empty but migration history is missing.'
        log 'Resolve this explicitly by baselining the database once or resetting it, then rerun the container.'
    fi

    rm -f "$output_file"
    return 1
}

if [ -z "${DATABASE_URL:-}" ]; then
    log 'DATABASE_URL is required.'
    exit 1
fi

log 'Starting container bootstrap'
log "Database URL: $(mask_database_url)"
log 'Generating Prisma client'
npm run db:generate

if [ "${SKIP_DB_MIGRATIONS:-false}" = "true" ]; then
    log 'Skipping Prisma migrations because SKIP_DB_MIGRATIONS=true'
else
    log 'Deploying Prisma migrations'
    run_migrations
fi

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
    log 'Seeding database'
    npm run db:seed
fi

log "Starting application: $*"
exec "$@"
