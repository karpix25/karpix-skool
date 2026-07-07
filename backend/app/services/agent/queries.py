import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ...models_agent import AgentRun
from ...schemas.agent import AgentRunRead
from .runs import get_agent_run_detail


async def list_agent_runs(
    *,
    session: AsyncSession,
    tenant_id: uuid.UUID,
    limit: int = 50,
) -> list[AgentRunRead]:
    safe_limit = min(max(limit, 1), 100)
    statement = (
        select(AgentRun)
        .where(AgentRun.tenant_id == tenant_id)
        .order_by(AgentRun.created_at.desc())
        .limit(safe_limit)
    )
    result = await session.exec(statement)
    return [
        await get_agent_run_detail(session=session, run=run)
        for run in result.all()
    ]
