from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..services.deep_links import resolve_start_param
from .auth import get_current_user


router = APIRouter()


@router.get("/deeplink/resolve")
async def resolve_deep_link(
    start_param: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await resolve_start_param(
        start_param=start_param,
        current_user=current_user,
        session=session,
    )
