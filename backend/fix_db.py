import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Try to import settings to get DATABASE_URL if env is missing
try:
    from app.config import settings
    DB_URL = settings.DATABASE_URL
except ImportError:
    DB_URL = os.environ.get("DATABASE_URL")

async def fix():
    if not DB_URL:
        print("DATABASE_URL not found in environment or settings!")
        return
    
    print(f"Connecting to database...")
    engine = create_async_engine(DB_URL)
    
    async with engine.begin() as conn:
        print("Checking columns in 'lesson' table...")
        # We use a safe way to add columns if they don't exist
        # PostgreSQL doesn't have a built-in IF NOT EXISTS for ADD COLUMN in older versions 
        # but 9.6+ has it. We'll use DO block for maximum safety if needed, 
        # or just try/except with individual statements.
        
        columns = [
            ("mux_asset_id", "TEXT"),
            ("mux_playback_id", "TEXT"),
            ("mux_status", "TEXT")
        ]
        
        for col, col_type in columns:
            try:
                # Using DO block to avoid errors if column already exists
                sql = f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='lesson' AND column_name='{col}') THEN
                        ALTER TABLE lesson ADD COLUMN {col} {col_type};
                    END IF;
                END
                $$;
                """
                await conn.execute(text(sql))
                print(f"SUCCESS: Column '{col}' is now present.")
            except Exception as e:
                print(f"WARNING: Could not verify/add column '{col}': {e}")
    
    await engine.dispose()
    print("Database fix script finished.")

if __name__ == "__main__":
    asyncio.run(fix())
