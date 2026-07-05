import type { ContextSwitcherTenant } from './types';

const subscriptionStatusLabels: Record<string, string> = {
    active: 'Активна',
    past_due: 'Пауза',
    trialing: 'Триал',
    canceled: 'Отключена',
};

function formatStudentCount(count: number): string {
    const normalizedCount = Math.abs(count);
    const lastTwoDigits = normalizedCount % 100;
    const lastDigit = normalizedCount % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return `${count} студентов`;
    }

    if (lastDigit === 1) {
        return `${count} студент`;
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} студента`;
    }

    return `${count} студентов`;
}

export function getTenantName(tenant: ContextSwitcherTenant): string {
    const name = tenant.name.trim();
    return name || 'Школа без названия';
}

export function getTenantInitials(tenant: ContextSwitcherTenant): string {
    return getTenantName(tenant)
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function getSubscriptionStatusLabel(status?: string | null): string | null {
    if (!status) {
        return null;
    }

    return subscriptionStatusLabels[status] ?? status.replaceAll('_', ' ');
}

export function getTenantMetaLabel(tenant: ContextSwitcherTenant): string {
    const parts: string[] = [];

    if (typeof tenant.member_count === 'number') {
        parts.push(formatStudentCount(tenant.member_count));
    }

    const statusLabel = getSubscriptionStatusLabel(tenant.subscription_status);
    if (statusLabel) {
        parts.push(statusLabel);
    }

    return parts.join(' · ');
}

export function getTenantOptionLabel(tenant: ContextSwitcherTenant): string {
    const meta = getTenantMetaLabel(tenant);
    return meta ? `${getTenantName(tenant)} — ${meta}` : getTenantName(tenant);
}

export function findSelectedTenant(
    tenants: ContextSwitcherTenant[],
    selectedTenantId: string | null
): ContextSwitcherTenant | null {
    if (!selectedTenantId) {
        return null;
    }

    return tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
}
