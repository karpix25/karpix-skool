import { Building2, ChevronDown } from 'lucide-react';

import { cn } from '../../../lib/utils';
import {
    findSelectedTenant,
    getTenantMetaLabel,
    getTenantName,
    getTenantOptionLabel,
} from './tenantDisplay';
import type { SuperAdminContextSwitcherProps, SuperAdminViewMode } from './types';
import {
    viewModeConfigs,
} from './viewModes';

const selectClassName = cn(
    'h-10 w-full min-w-0 appearance-none rounded-lg border border-input bg-card py-0 pl-9 pr-8 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[background-color,border-color,box-shadow]',
    'focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'
);

export const SuperAdminContextSwitcher = ({
    currentMode,
    selectedTenantId,
    tenants,
    onModeChange,
    onTenantChange,
    className,
}: SuperAdminContextSwitcherProps) => {
    const selectedTenant = findSelectedTenant(tenants, selectedTenantId);
    const selectedModeConfig = viewModeConfigs.find((modeConfig) => modeConfig.mode === currentMode) ?? viewModeConfigs[0];
    const SelectedModeIcon = selectedModeConfig.icon;
    const selectedTenantValue = selectedTenant?.id ?? '';
    const hasTenants = tenants.length > 0;
    const tenantMetaLabel = selectedTenant ? getTenantMetaLabel(selectedTenant) : null;

    return (
        <section className={cn('w-full', className)} aria-label="Контекст просмотра">
            <div className="grid grid-cols-[minmax(112px,0.86fr)_minmax(0,1.14fr)] gap-2">
                <label className="relative min-w-0" htmlFor="super-admin-view-mode-select">
                    <span className="sr-only">Режим просмотра</span>
                    <SelectedModeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <select
                        id="super-admin-view-mode-select"
                        aria-label="Режим просмотра"
                        className={selectClassName}
                        value={currentMode}
                        onChange={(event) => {
                            const nextMode = event.target.value as SuperAdminViewMode;
                            if (nextMode !== currentMode) {
                                onModeChange(nextMode);
                            }
                        }}
                    >
                        {viewModeConfigs.map((modeConfig) => (
                            <option key={modeConfig.mode} value={modeConfig.mode}>
                                {modeConfig.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </label>

                <label className="relative min-w-0" htmlFor="super-admin-tenant-select">
                    <span className="sr-only">Выбрать школу</span>
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                        id="super-admin-tenant-select"
                        aria-label="Выбрать школу"
                        className={selectClassName}
                        disabled={!hasTenants}
                        value={selectedTenantValue}
                        onChange={(event) => {
                            if (event.target.value) {
                                onTenantChange(event.target.value);
                            }
                        }}
                    >
                        <option value="" disabled>
                            {hasTenants ? 'Выбрать школу' : 'Нет школ'}
                        </option>
                        {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                                {getTenantOptionLabel(tenant)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </label>
            </div>

            <div className="mt-1 hidden min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground min-[430px]:flex">
                <span className="truncate">{selectedModeConfig.description}</span>
                {selectedTenant && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{getTenantName(selectedTenant)}</span>
                        {tenantMetaLabel && <span className="truncate">· {tenantMetaLabel}</span>}
                    </>
                )}
                {!selectedTenant && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">Школа не выбрана</span>
                    </>
                )}
            </div>
        </section>
    );
};
