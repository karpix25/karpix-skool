from sqlalchemy.dialects import postgresql

from app.models import NotebookGenerationProvider, PlatformGenerationSettings


def test_notebook_provider_uses_non_native_enum_matching_migration():
    column = PlatformGenerationSettings.__table__.c.notebook_provider

    assert column.type.native_enum is False
    assert column.type.length == 17
    assert column.type.enums == [provider.value for provider in NotebookGenerationProvider]


def test_notebook_provider_update_does_not_cast_to_missing_postgres_enum():
    table = PlatformGenerationSettings.__table__
    statement = (
        table.update()
        .where(table.c.key == "global")
        .values(notebook_provider=NotebookGenerationProvider.google_notebooklm)
    )

    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert "notebookgenerationprovider" not in compiled
