from enum import Enum

from app.models import Tenant, TenantSetupScope


class TenantTelegramGroupScope(str, Enum):
    regular = "regular"
    vip = "vip"


def setup_scope_for_group(scope: TenantTelegramGroupScope) -> TenantSetupScope:
    if scope == TenantTelegramGroupScope.vip:
        return TenantSetupScope.vip_group_link
    return TenantSetupScope.free_group_link


def clear_tenant_group_binding(tenant: Tenant, scope: TenantTelegramGroupScope) -> None:
    if scope == TenantTelegramGroupScope.vip:
        tenant.telegram_group_id_vip = None
        tenant.telegram_topic_id_vip = None
        tenant.vip_group_link = None
        tenant.last_sync_at = None
        return

    tenant.telegram_group_id = None
    tenant.telegram_topic_id = None
    tenant.free_group_link = None
    tenant.last_sync_at = None
