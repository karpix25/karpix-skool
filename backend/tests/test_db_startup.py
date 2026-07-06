import pytest

from app import db


class FakeConnection:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(str(statement))


class FakeBeginContext:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeEngine:
    def __init__(self):
        self.connection = FakeConnection()

    def begin(self):
        return FakeBeginContext(self.connection)


@pytest.mark.asyncio
async def test_init_db_checks_connectivity_without_migrations(monkeypatch):
    fake_engine = FakeEngine()
    monkeypatch.setattr(db, "engine", fake_engine)

    await db.init_db()

    assert fake_engine.connection.statements == ["SELECT 1"]
