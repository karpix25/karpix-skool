from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
import uuid

from pydantic import BaseModel

from ..models import NotebookGenerationProvider


NotebookLmAuthStatus = Literal[
    "package_missing",
    "ok",
    "missing_auth",
    "expired",
    "network_error",
    "error",
]


class MembershipInfo(BaseModel):
    tenant_id: uuid.UUID
    tenant_name: str
    role: str


class UserSuperRead(BaseModel):
    id: uuid.UUID
    telegram_id: Optional[int]
    username: Optional[str]
    is_super_admin: bool
    admin_status: str
    is_blocked: bool
    admin_request_details: Optional[Dict[str, Any]]
    memberships: List[MembershipInfo] = []


class SuperActivityTenantRef(BaseModel):
    id: uuid.UUID
    name: str


class SuperActivityActorRef(BaseModel):
    id: uuid.UUID
    username: Optional[str] = None


class SuperActivityRead(BaseModel):
    id: str
    occurred_at: datetime
    type: str
    event_type: str
    tone: Literal["success", "info", "warning", "danger"]
    title: str
    message: str
    tenant: Optional[SuperActivityTenantRef] = None
    actor: Optional[SuperActivityActorRef] = None
    meta: Optional[Dict[str, Any]] = None


class SuperApplicationRead(BaseModel):
    id: str
    kind: Literal["platform_lead", "author_request"]
    name: Optional[str] = None
    telegram: Optional[str] = None
    schoolName: Optional[str] = None
    description: Optional[str] = None
    status: str
    createdAt: Optional[datetime] = None
    source: str
    userId: Optional[uuid.UUID] = None
    leadId: Optional[uuid.UUID] = None


class NotebookLmAuthRead(BaseModel):
    package_installed: bool
    authenticated: bool
    profile: str
    status: NotebookLmAuthStatus
    message: str
    home: Optional[str] = None
    detail: Optional[Dict[str, Any]] = None
    raw: Optional[Dict[str, Any]] = None


class GenerationSettingsRead(BaseModel):
    notebook_provider: NotebookGenerationProvider
    effective_notebook_provider: NotebookGenerationProvider
    google_notebooklm_configured: bool
    google_notebooklm_profile: Optional[str] = None
    google_notebooklm_auth: Optional[NotebookLmAuthRead] = None
    updated_at: datetime


class GenerationSettingsUpdate(BaseModel):
    notebook_provider: NotebookGenerationProvider
