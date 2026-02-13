#!/bin/bash
set -e

# 1. Run migrations once
echo "ENTRYPOINT: Running database migrations..."
alembic upgrade head || { echo "MIGRATION FAILED"; exit 1; }

# 2. Start Gunicorn
echo "ENTRYPOINT: Starting Gunicorn..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
    --worker-connections 1000 \
    --max-requests 5000 \
    --max-requests-jitter 500 \
    --timeout 60 \
    "app.main:app" --bind "0.0.0.0:8000"
