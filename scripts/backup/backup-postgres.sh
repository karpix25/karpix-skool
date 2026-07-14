#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

MODE="$(postgres_mode)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"

require_non_negative_integer BACKUP_RETENTION_DAYS "$BACKUP_RETENTION_DAYS"
umask 077
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
chmod 700 "$BACKUP_DIR"

if [[ "$MODE" == "compose" ]]; then
    require_command docker
    cd "$PROJECT_ROOT"
    DATABASE_NAME="$(compose_database_name)"
else
    require_command pg_dump
    DATABASE_NAME="${PGDATABASE:-}"
    [[ -n "${PGUSER:-}" ]] || backup_die "PGUSER is required in direct mode"
fi

require_safe_database_name "$DATABASE_NAME"
FINAL_FILE="${BACKUP_DIR}/${DATABASE_NAME}-${TIMESTAMP}.dump"
TEMP_FILE="${FINAL_FILE}.partial"

cleanup_partial() {
    rm -f "$TEMP_FILE"
}
trap cleanup_partial EXIT INT TERM

backup_log "Creating PostgreSQL custom-format backup for ${DATABASE_NAME}"
if [[ "$MODE" == "compose" ]]; then
    # Variables are expanded by the shell inside the database container.
    # shellcheck disable=SC2016
    compose_command exec -T db sh -ec \
        'exec pg_dump --format=custom --compress=6 --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"' \
        >"$TEMP_FILE"
else
    pg_dump \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        --host="${PGHOST:-localhost}" \
        --port="${PGPORT:-5432}" \
        --username="$PGUSER" \
        --dbname="$DATABASE_NAME" \
        >"$TEMP_FILE"
fi

[[ -s "$TEMP_FILE" ]] || backup_die "pg_dump produced an empty file"
validate_archive "$MODE" "$TEMP_FILE"
mv "$TEMP_FILE" "$FINAL_FILE"
write_sha256 "$FINAL_FILE"
trap - EXIT INT TERM

upload_offsite() {
    local checksum_file="${FINAL_FILE}.sha256"
    local destination

    if [[ -n "${BACKUP_OFFSITE_RCLONE_REMOTE:-}" && -n "${BACKUP_OFFSITE_S3_URI:-}" ]]; then
        backup_die "Configure only one offsite target: rclone or S3"
    fi

    if [[ -n "${BACKUP_OFFSITE_RCLONE_REMOTE:-}" ]]; then
        require_command rclone
        destination="${BACKUP_OFFSITE_RCLONE_REMOTE%/}"
        backup_log "Copying backup and checksum with rclone"
        rclone copyto "$FINAL_FILE" "${destination}/$(basename "$FINAL_FILE")"
        rclone copyto "$checksum_file" "${destination}/$(basename "$checksum_file")"
    elif [[ -n "${BACKUP_OFFSITE_S3_URI:-}" ]]; then
        require_command aws
        destination="${BACKUP_OFFSITE_S3_URI%/}"
        backup_log "Copying backup and checksum with AWS CLI"
        if [[ -n "${BACKUP_S3_ENDPOINT_URL:-}" ]]; then
            aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 cp "$FINAL_FILE" "${destination}/$(basename "$FINAL_FILE")"
            aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 cp "$checksum_file" "${destination}/$(basename "$checksum_file")"
        else
            aws s3 cp "$FINAL_FILE" "${destination}/$(basename "$FINAL_FILE")"
            aws s3 cp "$checksum_file" "${destination}/$(basename "$checksum_file")"
        fi
    fi
}

upload_offsite

backup_log "Applying local retention: ${BACKUP_RETENTION_DAYS} days"
while IFS= read -r expired_file; do
    rm -f "$expired_file" "${expired_file}.sha256"
done < <(find "$BACKUP_DIR" -type f -name '*.dump' -mtime "+${BACKUP_RETENTION_DAYS}" -print)

backup_log "Backup verified: $FINAL_FILE"
printf '%s\n' "$FINAL_FILE"
