import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from sqlalchemy.future import select

from app.config import settings
from app.models import Tenant, TenantSetupScope, TenantSetupToken


SETUP_TOKEN_PREFIX = "SETUP2"
SETUP_TOKEN_RANDOM_BYTES = 32
DEFAULT_SETUP_TOKEN_TTL = timedelta(days=7)


class SetupTokenFailure(str, Enum):
    not_found = "not_found"
    expired = "expired"
    used = "used"
    wrong_scope = "wrong_scope"


@dataclass(frozen=True)
class SetupTokenIssue:
    token: str
    record: TenantSetupToken


@dataclass(frozen=True)
class SetupTokenResolution:
    tenant: Tenant | None
    record: TenantSetupToken | None
    failure: SetupTokenFailure | None = None

    @property
    def found(self) -> bool:
        return self.tenant is not None and self.record is not None and self.failure is None


@dataclass(frozen=True)
class SetupTokenValidation:
    allowed: bool
    failure: SetupTokenFailure | None = None


def generate_setup_token() -> str:
    token = secrets.token_urlsafe(SETUP_TOKEN_RANDOM_BYTES)
    return f"{SETUP_TOKEN_PREFIX}-{token}"


def hash_setup_token(token: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(),
        token.encode(),
        hashlib.sha256,
    ).hexdigest()


def mask_setup_secret(secret: str | None) -> str | None:
    if not secret:
        return None
    if len(secret) <= 10:
        return "****"
    return f"{secret[:6]}...{secret[-4:]}"


def setup_command_for_token(token: str, scope: TenantSetupScope) -> str:
    if scope == TenantSetupScope.vip_group_link:
        return f"/setup {token} vip"
    return f"/setup {token}"


async def issue_tenant_setup_token(
    session,
    *,
    tenant_id,
    scope: TenantSetupScope,
    created_by_user_id=None,
    now: datetime | None = None,
    expires_in: timedelta = DEFAULT_SETUP_TOKEN_TTL,
) -> SetupTokenIssue:
    now = now or datetime.utcnow()
    await revoke_active_setup_tokens(session, tenant_id=tenant_id, scope=scope, now=now)

    token = generate_setup_token()
    record = TenantSetupToken(
        tenant_id=tenant_id,
        token_hash=hash_setup_token(token),
        scope=scope,
        expires_at=now + expires_in,
        created_by_user_id=created_by_user_id,
        created_at=now,
    )
    session.add(record)
    return SetupTokenIssue(token=token, record=record)


async def revoke_active_setup_tokens(
    session,
    *,
    tenant_id,
    scope: TenantSetupScope,
    now: datetime | None = None,
) -> int:
    now = now or datetime.utcnow()
    result = await session.execute(
        select(TenantSetupToken).where(
            TenantSetupToken.tenant_id == tenant_id,
            TenantSetupToken.scope == scope,
            TenantSetupToken.used_at == None,
            TenantSetupToken.expires_at > now,
        )
    )
    records = result.scalars().all()
    for record in records:
        record.used_at = now
        session.add(record)
    return len(records)


async def resolve_tenant_setup_token(
    session,
    token: str,
    *,
    now: datetime | None = None,
    lock_for_update: bool = False,
) -> SetupTokenResolution:
    statement = select(TenantSetupToken).where(
        TenantSetupToken.token_hash == hash_setup_token(token)
    )
    if lock_for_update:
        statement = statement.with_for_update()
    result = await session.execute(statement)
    record = result.scalars().first()
    if not record:
        return SetupTokenResolution(None, None, SetupTokenFailure.not_found)

    validation = validate_setup_token_record(record, now=now)
    if not validation.allowed:
        return SetupTokenResolution(None, record, validation.failure)

    tenant_statement = select(Tenant).where(Tenant.id == record.tenant_id)
    if lock_for_update:
        tenant_statement = tenant_statement.with_for_update()
    tenant_result = await session.execute(tenant_statement)
    tenant = tenant_result.scalars().first()
    if not tenant:
        return SetupTokenResolution(None, record, SetupTokenFailure.not_found)

    return SetupTokenResolution(tenant, record)


def validate_setup_token_record(
    record: TenantSetupToken,
    *,
    expected_scope: TenantSetupScope | None = None,
    now: datetime | None = None,
) -> SetupTokenValidation:
    now = now or datetime.utcnow()
    if record.used_at is not None:
        return SetupTokenValidation(False, SetupTokenFailure.used)
    if record.expires_at <= now:
        return SetupTokenValidation(False, SetupTokenFailure.expired)
    if expected_scope is not None and record.scope != expected_scope:
        return SetupTokenValidation(False, SetupTokenFailure.wrong_scope)
    return SetupTokenValidation(True)


def mark_setup_token_used(record: TenantSetupToken, *, now: datetime | None = None) -> None:
    record.used_at = now or datetime.utcnow()
