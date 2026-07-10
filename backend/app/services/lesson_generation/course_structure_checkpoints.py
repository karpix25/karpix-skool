from datetime import datetime
from typing import Any
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_generation import CourseStructureGenerationCheckpoint


_UNSET = object()
_CHECKPOINT_FIELDS = {
    "current_stage",
    "source_fingerprint",
    "prompt_version",
    "provider",
    "model_name",
    "source_brief_json",
    "source_map_json",
    "product_strategy_json",
    "blueprint_json",
}


async def get_checkpoint(
    session: AsyncSession,
    job_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> CourseStructureGenerationCheckpoint | None:
    statement = select(CourseStructureGenerationCheckpoint).where(
        CourseStructureGenerationCheckpoint.job_id == job_id
    )
    if for_update:
        statement = statement.with_for_update()
    result = await session.exec(statement)
    return result.one_or_none()


async def upsert_checkpoint(
    session: AsyncSession,
    job_id: uuid.UUID,
    **changes: Any,
) -> CourseStructureGenerationCheckpoint:
    unknown = set(changes) - _CHECKPOINT_FIELDS
    if unknown:
        raise ValueError(f"Unsupported checkpoint fields: {', '.join(sorted(unknown))}")

    checkpoint = await get_checkpoint(session, job_id, for_update=True)
    if checkpoint is None:
        checkpoint = CourseStructureGenerationCheckpoint(job_id=job_id)
        session.add(checkpoint)
    for field_name, value in changes.items():
        if value is not _UNSET:
            setattr(checkpoint, field_name, value)
    checkpoint.updated_at = datetime.utcnow()
    await session.flush()
    return checkpoint
