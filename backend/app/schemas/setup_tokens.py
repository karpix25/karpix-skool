from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel

from app.models import TenantSetupScope


OwnerInviteStatusValue = Literal[
    "not_issued",
    "active",
    "expired",
    "claimed",
    "revoked",
]


class SetupTokenIssueRequest(BaseModel):
    scope: TenantSetupScope


class SetupTokenIssueResponse(BaseModel):
    token: str
    scope: TenantSetupScope
    expires_at: datetime
    setup_command: str


class OwnerInviteStatusRead(BaseModel):
    tenant_id: uuid.UUID
    status: OwnerInviteStatusValue
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class OwnerInviteIssueRead(OwnerInviteStatusRead):
    setup_command: str
