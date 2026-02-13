#!/bin/bash
set -e

if [ "$SKIP_MIGRATIONS" != "1" ]; then
    echo "ENTRYPOINT: Running database migrations..."
    if alembic upgrade head; then
        echo "ENTRYPOINT: Migrations completed successfully."
    else
        echo "ENTRYPOINT: Migration failed. Cleaning orphaned objects from previous crash..."
        python3 << 'PYEOF'
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def cleanup():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        # Drop tables in reverse dependency order
        for tbl in ["lessonprogress","lesson","module","tenantmember","course","tenant"]:
            await conn.execute(text(f"DROP TABLE IF EXISTS {tbl} CASCADE"))
        await conn.execute(text('DROP TABLE IF EXISTS "user" CASCADE'))
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
        # Drop orphaned enum types
        for typ in ["useradminstatus","subscriptionstatus","courseunlocktype","memberrole","memberstatus","unlocktype","videoprovider"]:
            await conn.execute(text(f"DROP TYPE IF EXISTS {typ}"))
    await engine.dispose()
    print("Cleanup complete.")

asyncio.run(cleanup())
PYEOF
        echo "ENTRYPOINT: Retrying migration on clean database..."
        alembic upgrade head || { echo "MIGRATION FAILED"; exit 1; }
    fi
else
    echo "ENTRYPOINT: Skipping migrations (SKIP_MIGRATIONS=1)"
fi

echo "ENTRYPOINT: Executing command: $@"
exec "$@"
