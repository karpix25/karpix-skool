#!/usr/bin/env bash

set -euo pipefail

backup_log() {
    printf '[backup] %s\n' "$*" >&2
}

backup_die() {
    printf '[backup] ERROR: %s\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || backup_die "Required command is not installed: $1"
}

require_non_negative_integer() {
    local name="$1"
    local value="$2"
    [[ "$value" =~ ^[0-9]+$ ]] || backup_die "$name must be a non-negative integer"
}

require_safe_database_name() {
    local value="$1"
    [[ -n "$value" ]] || backup_die "Database name must not be empty"
    [[ "$value" =~ ^[A-Za-z0-9_.-]+$ ]] || backup_die "Database name contains unsupported characters"
}

postgres_mode() {
    local mode="${PG_BACKUP_MODE:-compose}"
    case "$mode" in
        compose|direct)
            printf '%s\n' "$mode"
            ;;
        *)
            backup_die "PG_BACKUP_MODE must be 'compose' or 'direct'"
            ;;
    esac
}

compose_command() {
    if docker compose version >/dev/null 2>&1; then
        docker compose "${@}"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose "${@}"
    else
        backup_die "Docker Compose is required for PG_BACKUP_MODE=compose"
    fi
}

compose_database_name() {
    # Variables are expanded by the shell inside the database container.
    # shellcheck disable=SC2016
    compose_command exec -T db sh -ec 'printf "%s" "$POSTGRES_DB"'
}

write_sha256() {
    local file="$1"
    local directory
    local filename
    directory="$(cd "$(dirname "$file")" && pwd)"
    filename="$(basename "$file")"

    if command -v sha256sum >/dev/null 2>&1; then
        (cd "$directory" && sha256sum "$filename" >"${filename}.sha256")
    elif command -v shasum >/dev/null 2>&1; then
        (cd "$directory" && shasum -a 256 "$filename" >"${filename}.sha256")
    else
        backup_die "sha256sum or shasum is required"
    fi
}

verify_sha256() {
    local file="$1"
    local checksum_file="$2"
    local directory
    local filename
    local expected
    local actual

    [[ -f "$checksum_file" ]] || backup_die "Checksum file not found: $checksum_file"
    directory="$(cd "$(dirname "$file")" && pwd)"
    filename="$(basename "$file")"
    expected="$(awk 'NR == 1 { print $1 }' "$checksum_file")"
    [[ "$expected" =~ ^[[:xdigit:]]{64}$ ]] || backup_die "Checksum file is invalid: $checksum_file"

    if command -v sha256sum >/dev/null 2>&1; then
        actual="$(cd "$directory" && sha256sum "$filename" | awk '{ print $1 }')"
    elif command -v shasum >/dev/null 2>&1; then
        actual="$(cd "$directory" && shasum -a 256 "$filename" | awk '{ print $1 }')"
    else
        backup_die "sha256sum or shasum is required"
    fi

    [[ "$actual" == "$expected" ]] || backup_die "Checksum validation failed for $file"
}

validate_archive() {
    local mode="$1"
    local file="$2"

    if [[ "$mode" == "compose" ]]; then
        compose_command exec -T db pg_restore --list <"$file" >/dev/null
    else
        require_command pg_restore
        pg_restore --list "$file" >/dev/null
    fi
}
