import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SuperAdminContextSwitcher } from './SuperAdminContextSwitcher';
import {
    findSelectedTenant,
    getSubscriptionStatusLabel,
    getTenantInitials,
    getTenantMetaLabel,
    getTenantOptionLabel,
} from './tenantDisplay';
import type { ContextSwitcherTenant } from './types';
import {
    getViewModeDescription,
    getViewModeLabel,
    getViewModeTargetRoute,
    isTenantScopedViewMode,
} from './viewModes';

const tenants: ContextSwitcherTenant[] = [
    {
        id: 'school-alpha',
        name: 'Alpha School',
        member_count: 21,
        subscription_status: 'active',
    },
    {
        id: 'school-beta',
        name: 'Beta Pro',
        member_count: 64,
        subscription_status: 'past_due',
    },
];

describe('super-admin context switcher helpers', () => {
    it('returns labels, descriptions, and tenant-aware target routes for view modes', () => {
        expect(getViewModeLabel('super_admin')).toBe('Суперадмин');
        expect(getViewModeLabel('moderator')).toBe('Модератор');
        expect(getViewModeDescription('student')).toBe('Обычный ученический вид');
        expect(isTenantScopedViewMode('admin')).toBe(true);
        expect(isTenantScopedViewMode('student')).toBe(true);
        expect(getViewModeTargetRoute('admin', 'school beta')).toBe('/?tenant=school%20beta');
        expect(getViewModeTargetRoute('super_admin', 'school-alpha')).toBe('/');
    });

    it('builds readable tenant labels without mutating tenant data', () => {
        expect(findSelectedTenant(tenants, 'school-beta')).toBe(tenants[1]);
        expect(findSelectedTenant(tenants, 'missing')).toBeNull();
        expect(getTenantInitials(tenants[0])).toBe('AS');
        expect(getTenantMetaLabel(tenants[0])).toBe('21 студент · Активна');
        expect(getTenantOptionLabel(tenants[1])).toBe('Beta Pro — 64 студента · Пауза');
        expect(getSubscriptionStatusLabel('custom_status')).toBe('custom status');
    });
});

describe('SuperAdminContextSwitcher', () => {
    it('renders view modes and calls callbacks for mode and tenant changes', async () => {
        const user = userEvent.setup();
        const onModeChange = vi.fn();
        const onTenantChange = vi.fn();

        render(
            <SuperAdminContextSwitcher
                currentMode="admin"
                selectedTenantId="school-beta"
                tenants={tenants}
                onModeChange={onModeChange}
                onTenantChange={onTenantChange}
            />
        );

        const modeSelect = screen.getByLabelText('Режим просмотра');
        expect(modeSelect).toHaveValue('admin');
        expect(screen.getByLabelText('Выбрать школу')).toHaveValue('school-beta');
        expect(screen.getByText('Beta Pro')).toBeInTheDocument();

        await user.selectOptions(modeSelect, 'moderator');
        expect(onModeChange).toHaveBeenCalledWith('moderator');

        await user.selectOptions(modeSelect, 'admin');
        expect(onModeChange).toHaveBeenCalledTimes(1);

        await user.selectOptions(screen.getByLabelText('Выбрать школу'), 'school-alpha');
        expect(onTenantChange).toHaveBeenCalledWith('school-alpha');
    });

    it('keeps the tenant select disabled when there are no schools', () => {
        render(
            <SuperAdminContextSwitcher
                currentMode="super_admin"
                selectedTenantId={null}
                tenants={[]}
                onModeChange={vi.fn()}
                onTenantChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText('Выбрать школу')).toBeDisabled();
        expect(screen.getByText('Школа не выбрана')).toBeInTheDocument();
    });
});
