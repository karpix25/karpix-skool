#!/bin/bash
set -e

# 1. Run migrations once
if [ "$SKIP_MIGRATIONS" != "1" ]; then
    echo "ENTRYPOINT: Running database migrations..."
    alembic upgrade head || { echo "MIGRATION FAILED"; exit 1; }
else
    echo "ENTRYPOINT: Skipping migrations (SKIP_MIGRATIONS=1)"
fi

# 2. Execute the command passed to the container
echo "ENTRYPOINT: Executing command: $@"
exec "$@"
