import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Tenant, User
from ..routes.auth import get_current_user
from ..schemas.agent import (
    AgentApprovalDecisionCreate,
    AgentPublishCreate,
    AgentPublishResult,
    AgentRunCreate,
    AgentRunRead,
)
from ..schemas.generation_sources import GenerationSourceUploadRead
from ..services.agent import (
    approve_agent_run,
    create_agent_run,
    get_agent_run,
    get_agent_run_detail,
    list_agent_runs,
    publish_agent_run,
    reject_agent_run,
    retry_agent_run,
)
from ..services.agent.exceptions import AgentRunOperationError
from ..services.generation_source_uploads import upload_generation_source_file
from ..utils.security import ensure_tenant_access
from ..utils.tenant import get_active_tenant_id

router = APIRouter()


@router.post("/runs", response_model=AgentRunRead, status_code=status.HTTP_201_CREATED)
async def create_run(
    request: AgentRunCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await ensure_tenant_access(request.tenant_id, current_user, session, require_write=True)
    return await create_agent_run(session=session, current_user=current_user, request=request)


@router.post("/source-files", response_model=GenerationSourceUploadRead, status_code=status.HTTP_201_CREATED)
async def upload_agent_generation_source_file(
    request: Request,
    file: UploadFile = File(...),
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await ensure_tenant_access(tenant_id, current_user, session, require_write=True)
    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return await upload_generation_source_file(
        request=request,
        file=file,
        folder=f"generation-sources/{tenant_id}/agent-runs",
        session=session,
        tenant=tenant,
    )


@router.get("/runs", response_model=list[AgentRunRead])
async def list_runs(
    limit: int = 50,
    tenant_id: uuid.UUID = Depends(get_active_tenant_id),
    session: AsyncSession = Depends(get_session),
):
    return await list_agent_runs(session=session, tenant_id=tenant_id, limit=limit)


@router.get("/runs/{run_id}", response_model=AgentRunRead)
async def read_run(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    run = await _get_accessible_run(
        session=session,
        run_id=run_id,
        current_user=current_user,
    )
    return await get_agent_run_detail(session=session, run=run)


@router.post("/runs/{run_id}/approve", response_model=AgentRunRead)
async def approve_run(
    run_id: uuid.UUID,
    request: AgentApprovalDecisionCreate | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    run = await _get_accessible_run(
        session=session,
        run_id=run_id,
        current_user=current_user,
        require_write=True,
    )
    try:
        return await approve_agent_run(
            session=session,
            run=run,
            current_user=current_user,
            request=request or AgentApprovalDecisionCreate(),
        )
    except AgentRunOperationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/runs/{run_id}/reject", response_model=AgentRunRead)
async def reject_run(
    run_id: uuid.UUID,
    request: AgentApprovalDecisionCreate | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    run = await _get_accessible_run(
        session=session,
        run_id=run_id,
        current_user=current_user,
        require_write=True,
    )
    try:
        return await reject_agent_run(
            session=session,
            run=run,
            current_user=current_user,
            request=request or AgentApprovalDecisionCreate(),
        )
    except AgentRunOperationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/runs/{run_id}/publish", response_model=AgentPublishResult)
async def publish_run(
    run_id: uuid.UUID,
    request: AgentPublishCreate | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    run = await _get_accessible_run(
        session=session,
        run_id=run_id,
        current_user=current_user,
        require_write=True,
    )
    try:
        return await publish_agent_run(
            session=session,
            run=run,
            current_user=current_user,
            request=request or AgentPublishCreate(),
        )
    except AgentRunOperationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/runs/{run_id}/retry", response_model=AgentRunRead, status_code=status.HTTP_201_CREATED)
async def retry_run(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    run = await _get_accessible_run(
        session=session,
        run_id=run_id,
        current_user=current_user,
        require_write=True,
    )
    try:
        return await retry_agent_run(session=session, run=run, current_user=current_user)
    except AgentRunOperationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


async def _get_accessible_run(
    *,
    session: AsyncSession,
    run_id: uuid.UUID,
    current_user: User,
    require_write: bool = False,
):
    run = await get_agent_run(session, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    await ensure_tenant_access(
        run.tenant_id,
        current_user,
        session,
        require_write=require_write,
    )
    return run
