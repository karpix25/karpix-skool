#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

BACKUP_FILE="${1:-}"
[[ -n "$BACKUP_FILE" ]] || backup_die "Usage: $0 /path/to/backup.dump [checksum-file]"
[[ -s "$BACKUP_FILE" ]] || backup_die "Backup file is missing or empty: $BACKUP_FILE"
BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"

CHECKSUM_FILE="${2:-${BACKUP_FILE}.sha256}"
[[ -f "$CHECKSUM_FILE" ]] || backup_die "Checksum file not found: $CHECKSUM_FILE"
CHECKSUM_FILE="$(cd "$(dirname "$CHECKSUM_FILE")" && pwd)/$(basename "$CHECKSUM_FILE")"
MODE="$(postgres_mode)"

if [[ "$MODE" == "compose" ]]; then
    require_command docker
    cd "$PROJECT_ROOT"
fi

verify_sha256 "$BACKUP_FILE" "$CHECKSUM_FILE"
validate_archive "$MODE" "$BACKUP_FILE"
backup_log "Checksum and PostgreSQL archive validation passed: $BACKUP_FILE"
