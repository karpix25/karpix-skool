#!/bin/bash
set -e

# 1. Run migrations once
echo "ENTRYPOINT: Running database migrations..."
alembic upgrade head || { echo "MIGRATION FAILED"; exit 1; }

# 2. Execute the command passed to the container
echo "ENTRYPOINT: Executing command: $@"
exec "$@"
