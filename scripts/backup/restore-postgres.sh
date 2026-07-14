#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
    cat >&2 <<'USAGE'
Usage:
  restore-postgres.sh --clean-db BACKUP.dump [--checksum FILE]
                      [--database NAME] [--confirm-database NAME]
                      [--maintenance-confirmed]

The target database is dropped, recreated, and restored. A non-test database
requires the exact database confirmation and a maintenance-mode acknowledgement.
USAGE
}

BACKUP_FILE=""
CHECKSUM_FILE=""
TARGET_DATABASE="${RESTORE_DATABASE:-}"
CONFIRMED_DATABASE=""
CLEAN_DATABASE=false
MAINTENANCE_CONFIRMED=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean-db)
            CLEAN_DATABASE=true
            shift
            ;;
        --checksum)
            [[ $# -ge 2 ]] || backup_die "--checksum requires a file"
            CHECKSUM_FILE="$2"
            shift 2
            ;;
        --database)
            [[ $# -ge 2 ]] || backup_die "--database requires a name"
            TARGET_DATABASE="$2"
            shift 2
            ;;
        --confirm-database)
            [[ $# -ge 2 ]] || backup_die "--confirm-database requires a name"
            CONFIRMED_DATABASE="$2"
            shift 2
            ;;
        --maintenance-confirmed)
            MAINTENANCE_CONFIRMED=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --*)
            usage
            backup_die "Unknown option: $1"
            ;;
        *)
            [[ -z "$BACKUP_FILE" ]] || backup_die "Only one backup file may be supplied"
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

[[ "$CLEAN_DATABASE" == true ]] || backup_die "Restore requires --clean-db"
[[ -n "$BACKUP_FILE" ]] || { usage; backup_die "Backup file is required"; }
[[ -s "$BACKUP_FILE" ]] || backup_die "Backup file is missing or empty: $BACKUP_FILE"
BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"
CHECKSUM_FILE="${CHECKSUM_FILE:-${BACKUP_FILE}.sha256}"
[[ -f "$CHECKSUM_FILE" ]] || backup_die "Checksum file not found: $CHECKSUM_FILE"
CHECKSUM_FILE="$(cd "$(dirname "$CHECKSUM_FILE")" && pwd)/$(basename "$CHECKSUM_FILE")"
MODE="$(postgres_mode)"

if [[ "$MODE" == "compose" ]]; then
    require_command docker
    cd "$PROJECT_ROOT"
    TARGET_DATABASE="${TARGET_DATABASE:-$(compose_database_name)}"
else
    require_command dropdb
    require_command createdb
    require_command pg_restore
    [[ -n "${PGUSER:-}" ]] || backup_die "PGUSER is required in direct mode"
    TARGET_DATABASE="${TARGET_DATABASE:-${PGDATABASE:-}}"
fi

require_safe_database_name "$TARGET_DATABASE"
verify_sha256 "$BACKUP_FILE" "$CHECKSUM_FILE"
validate_archive "$MODE" "$BACKUP_FILE"

TEST_DATABASE_PATTERN="${RESTORE_TEST_DATABASE_PATTERN:-(^|[-_.])(test|restore|drill)([-_.]|$)}"
if [[ ! "$TARGET_DATABASE" =~ $TEST_DATABASE_PATTERN ]]; then
    [[ "$CONFIRMED_DATABASE" == "$TARGET_DATABASE" ]] || backup_die \
        "Refusing destructive restore. Re-run with --confirm-database ${TARGET_DATABASE}"
    [[ "$MAINTENANCE_CONFIRMED" == true ]] || backup_die \
        "Refusing live restore. Stop application writers and pass --maintenance-confirmed"
fi

backup_log "Checksum validated; recreating target database ${TARGET_DATABASE}"
if [[ "$MODE" == "compose" ]]; then
    compose_command exec -T db sh -ec \
        'dropdb --if-exists --force --username "$POSTGRES_USER" "$1" && createdb --username "$POSTGRES_USER" "$1"' \
        sh "$TARGET_DATABASE"
    compose_command exec -T db sh -ec \
        'exec pg_restore --exit-on-error --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$1"' \
        sh "$TARGET_DATABASE" <"$BACKUP_FILE"
else
    CONNECTION_ARGS=(
        --host="${PGHOST:-localhost}"
        --port="${PGPORT:-5432}"
        --username="$PGUSER"
    )
    dropdb "${CONNECTION_ARGS[@]}" --maintenance-db="${PGMAINTENANCE_DB:-postgres}" --if-exists --force "$TARGET_DATABASE"
    createdb "${CONNECTION_ARGS[@]}" --maintenance-db="${PGMAINTENANCE_DB:-postgres}" "$TARGET_DATABASE"
    pg_restore \
        "${CONNECTION_ARGS[@]}" \
        --exit-on-error \
        --no-owner \
        --no-privileges \
        --dbname="$TARGET_DATABASE" \
        "$BACKUP_FILE"
fi

backup_log "Restore completed: $TARGET_DATABASE"
backup_log "Run the verification queries from docs/BACKUP_RESTORE.md before reopening traffic"
