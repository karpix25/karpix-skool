import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..schemas.webapp_levels import WebAppLevelsResponse
from ..services.webapp.levels import build_webapp_levels_response
from .auth import get_current_user

router = APIRouter()


@router.get("/levels", response_model=WebAppLevelsResponse)
async def get_webapp_levels(
    request: Request,
    tenant_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> WebAppLevelsResponse:
    return await build_webapp_levels_response(
        session=session,
        request=request,
        current_user=current_user,
        tenant_id=tenant_id,
    )
