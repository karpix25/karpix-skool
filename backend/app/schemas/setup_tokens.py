from datetime import datetime

from pydantic import BaseModel

from app.models import TenantSetupScope


class SetupTokenIssueRequest(BaseModel):
    scope: TenantSetupScope


class SetupTokenIssueResponse(BaseModel):
    token: str
    scope: TenantSetupScope
    expires_at: datetime
    setup_command: str
