import { CheckCircle2, Search, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { Tenant } from './types';

interface GlobalTabProps {
    tenants: Tenant[];
    activeTenantId: string | null;
    search: string;
    onSearchChange: (value: string) => void;
    onSelectTenant: (tenantId: string) => void;
    onToggleStatus: (tenantId: string, currentStatus: string) => void;
    onDeleteTenant: (tenant: Tenant) => void;
}

export const GlobalTab = ({
    tenants,
    activeTenantId,
    search,
    onSearchChange,
    onSelectTenant,
    onToggleStatus,
    onDeleteTenant,
}: GlobalTabProps) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Управление школами</p>
                    <h3 className="mt-1 text-2xl font-semibold leading-tight">Школы</h3>
                </div>
                <Badge variant="outline" className="shrink-0">{tenants.length}</Badge>
            </div>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Поиск..."
                    className="h-11 pl-9 text-sm"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>

        <div className="space-y-2">
            {tenants.map(tenant => (
                <article key={tenant.id} className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                            {tenant.name.substring(0, 2)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h4 className="truncate text-base font-semibold">{tenant.name}</h4>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">@{tenant.owner_username || 'anonymous'} · {tenant.member_count} студентов</p>
                                </div>
                                <button
                                    type="button"
                                    className={cn(
                                        "h-11 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25",
                                        tenant.subscription_status === 'active'
                                            ? "border-success/20 bg-success/10 text-success hover:bg-success/15"
                                            : "border-danger/20 bg-danger/10 text-danger hover:bg-danger/15"
                                    )}
                                    onClick={() => onToggleStatus(tenant.id, tenant.subscription_status)}
                                >
                                    {tenant.subscription_status === 'active' ? 'Активна' : 'Пауза'}
                                </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/45 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Код подключения</p>
                                    <p className="truncate font-mono text-sm font-semibold">{tenant.setup_code || '---'}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        variant={activeTenantId === tenant.id ? 'secondary' : 'outline'}
                                        className="h-11 rounded-lg px-3 text-xs font-medium"
                                        onClick={() => onSelectTenant(tenant.id)}
                                    >
                                        <CheckCircle2 size={14} />
                                        {activeTenantId === tenant.id ? 'Выбрана' : 'Выбрать'}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg text-muted-foreground hover:bg-danger/5 hover:text-danger" onClick={() => onDeleteTenant(tenant)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    </div>
);
