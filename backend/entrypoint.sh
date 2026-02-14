#!/bin/bash
set -e

if [ "$SKIP_MIGRATIONS" != "1" ]; then
    echo "ENTRYPOINT: Running database migrations..."
    alembic upgrade head || { echo "MIGRATION FAILED"; exit 1; }
    echo "ENTRYPOINT: Migrations completed successfully."
else
    echo "ENTRYPOINT: Skipping migrations (SKIP_MIGRATIONS=1)"
fi

echo "ENTRYPOINT: Executing command: $@"
exec "$@"
