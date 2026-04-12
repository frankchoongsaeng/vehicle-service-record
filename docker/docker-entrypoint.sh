#!/bin/sh
set -eu

log() {
    printf '%s\n' "$*"
}

require_database_env() {
    variable_name="$1"
    variable_value=$(printenv "$variable_name" 2>/dev/null || true)

    if [ -z "$variable_value" ]; then
        log "$variable_name is required."
        exit 1
    fi
}

compose_database_url() {
    mysql_host="${MYSQL_HOST:-127.0.0.1}"
    mysql_port="${MYSQL_PORT:-3306}"

    require_database_env MYSQL_DATABASE
    require_database_env MYSQL_USER
    require_database_env MYSQL_PASSWORD

    printf 'mysql://%s:%s@%s:%s/%s\n' \
        "$MYSQL_USER" \
        "$MYSQL_PASSWORD" \
        "$mysql_host" \
        "$mysql_port" \
        "$MYSQL_DATABASE"
}

mask_database_url() {
    compose_database_url | sed -E 's#(mysql://[^:]+:)[^@]*@#\1****@#'
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

export DATABASE_URL="$(compose_database_url)"

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
