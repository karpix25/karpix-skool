import { Building2 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';
import {
    findSelectedTenant,
    getSubscriptionStatusLabel,
    getTenantInitials,
    getTenantMetaLabel,
    getTenantName,
    getTenantOptionLabel,
} from './tenantDisplay';
import type { SuperAdminContextSwitcherProps, SuperAdminViewMode } from './types';
import {
    getViewModeDescription,
    viewModeConfigs,
} from './viewModes';

interface ViewModeSegmentProps {
    currentMode: SuperAdminViewMode;
    onModeChange: (mode: SuperAdminViewMode) => void;
}

const ViewModeSegment = ({ currentMode, onModeChange }: ViewModeSegmentProps) => (
    <div
        role="radiogroup"
        aria-label="Режим просмотра"
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1 sm:grid-cols-4"
    >
        {viewModeConfigs.map((modeConfig) => {
            const isActive = modeConfig.mode === currentMode;
            const ModeIcon = modeConfig.icon;

            return (
                <button
                    key={modeConfig.mode}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${modeConfig.label}. ${modeConfig.description}`}
                    title={modeConfig.description}
                    className={cn(
                        'flex min-h-12 min-w-0 flex-col justify-center rounded-md px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
                        isActive
                            ? 'border border-border bg-card text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                    )}
                    onClick={() => {
                        if (!isActive) {
                            onModeChange(modeConfig.mode);
                        }
                    }}
                >
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                        <ModeIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                        <span className="truncate">{modeConfig.label}</span>
                    </span>
                    <span className="mt-1 hidden truncate text-[11px] font-medium opacity-75 min-[390px]:block">
                        {modeConfig.description}
                    </span>
                </button>
            );
        })}
    </div>
);

interface TenantSelectProps {
    selectedTenantId: string | null;
    tenants: SuperAdminContextSwitcherProps['tenants'];
    onTenantChange: (tenantId: string) => void;
}

const TenantSelect = ({ selectedTenantId, tenants, onTenantChange }: TenantSelectProps) => {
    const selectedTenant = findSelectedTenant(tenants, selectedTenantId);
    const selectedValue = selectedTenant?.id ?? '';
    const hasTenants = tenants.length > 0;

    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="super-admin-tenant-select">
                Школа
            </label>
            <div className="relative">
                <select
                    id="super-admin-tenant-select"
                    aria-label="Выбрать школу"
                    className="h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card px-3 pr-10 text-sm font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    disabled={!hasTenants}
                    value={selectedValue}
                    onChange={(event) => {
                        if (event.target.value) {
                            onTenantChange(event.target.value);
                        }
                    }}
                >
                    <option value="" disabled>
                        {hasTenants ? 'Выбрать школу' : 'Нет школ для выбора'}
                    </option>
                    {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                            {getTenantOptionLabel(tenant)}
                        </option>
                    ))}
                </select>
                <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
        </div>
    );
};

interface SelectedTenantSummaryProps {
    tenant: ReturnType<typeof findSelectedTenant>;
}

const SelectedTenantSummary = ({ tenant }: SelectedTenantSummaryProps) => {
    if (!tenant) {
        return (
            <div className="rounded-lg border border-dashed border-border bg-muted/35 px-3 py-2.5 text-sm text-muted-foreground">
                Школа не выбрана
            </div>
        );
    }

    const metaLabel = getTenantMetaLabel(tenant);
    const statusLabel = getSubscriptionStatusLabel(tenant.subscription_status);

    return (
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                    {getTenantInitials(tenant)}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{getTenantName(tenant)}</p>
                    {metaLabel && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{metaLabel}</p>
                    )}
                </div>
            </div>
            {statusLabel && (
                <Badge
                    variant="outline"
                    className="shrink-0 rounded-md border-border bg-muted/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                    {statusLabel}
                </Badge>
            )}
        </div>
    );
};

export const SuperAdminContextSwitcher = ({
    currentMode,
    selectedTenantId,
    tenants,
    onModeChange,
    onTenantChange,
    className,
}: SuperAdminContextSwitcherProps) => {
    const selectedTenant = findSelectedTenant(tenants, selectedTenantId);

    return (
        <section className={cn('w-full space-y-3', className)} aria-label="Контекст просмотра">
            <div className="space-y-2">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Режим просмотра</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                        {getViewModeDescription(currentMode)}
                    </p>
                </div>
                <ViewModeSegment currentMode={currentMode} onModeChange={onModeChange} />
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
                <TenantSelect
                    tenants={tenants}
                    selectedTenantId={selectedTenantId}
                    onTenantChange={onTenantChange}
                />
                <SelectedTenantSummary tenant={selectedTenant} />
            </div>
        </section>
    );
};
