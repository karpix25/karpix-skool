import { useState } from 'react';
import { CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { GenerationSettingsPanel } from './GenerationSettingsPanel';
import { SchoolInviteDialog } from './school-invite/SchoolInviteDialog';
import { OwnerInvitePanel } from './school-invite/OwnerInvitePanel';
import { SubscriptionPanel } from './subscription/SubscriptionPanel';
import type { GenerationSettings, NotebookGenerationProvider, Tenant } from './types';

interface GlobalTabProps {
    tenants: Tenant[];
    activeTenantId: string | null;
    search: string;
    onSearchChange: (value: string) => void;
    onSelectTenant: (tenantId: string) => void;
    onDeleteTenant: (tenant: Tenant) => void;
    generationSettings: GenerationSettings | null;
    isGenerationSettingsSaving: boolean;
    isNotebookLmAuthLoading: boolean;
    generationSettingsError: string | null;
    onGenerationProviderChange: (provider: NotebookGenerationProvider) => void;
    onNotebookLmAuthOpen: () => void;
}

export const GlobalTab = ({
    tenants,
    activeTenantId,
    search,
    onSearchChange,
    onSelectTenant,
    onDeleteTenant,
    generationSettings,
    isGenerationSettingsSaving,
    isNotebookLmAuthLoading,
    generationSettingsError,
    onGenerationProviderChange,
    onNotebookLmAuthOpen,
}: GlobalTabProps) => {
    const [inviteOpen, setInviteOpen] = useState(false);
    const selectedTenant = tenants.find((tenant) => tenant.id === activeTenantId) || null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <GenerationSettingsPanel
            settings={generationSettings}
            isSaving={isGenerationSettingsSaving}
            isAuthRefreshing={isNotebookLmAuthLoading}
            error={generationSettingsError}
            onProviderChange={onGenerationProviderChange}
            onAuthOpen={onNotebookLmAuthOpen}
        />

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Управление школами</p>
                    <h3 className="mt-1 text-2xl font-semibold leading-tight">Школы</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">{tenants.length}</Badge>
                    <Button className="whitespace-nowrap" onClick={() => setInviteOpen(true)}>
                        <Plus aria-hidden="true" /> Новая школа
                    </Button>
                </div>
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

        <SubscriptionPanel tenant={selectedTenant} />
        <OwnerInvitePanel tenant={selectedTenant} />

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
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {tenant.owner_username ? `@${tenant.owner_username}` : 'Владелец не назначен'} · {tenant.student_count} студентов
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                                        tenant.subscription_status === 'active'
                                            ? "border-success/20 bg-success/10 text-success"
                                            : "border-danger/20 bg-danger/10 text-danger"
                                    )}
                                >
                                    {tenant.subscription_status === 'active' ? 'Активна' : 'Пауза'}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <Badge variant={tenant.onboarding_stage === 'launched' ? 'default' : 'secondary'}>
                                    {ONBOARDING_STAGE_LABELS[tenant.onboarding_stage]}
                                </Badge>
                                <span className="text-muted-foreground">
                                    {tenant.has_telegram_group ? 'Telegram подключён' : 'Telegram не подключён'}
                                </span>
                                <span className="text-muted-foreground">
                                    {tenant.has_published_lesson ? 'Урок опубликован' : 'Нет опубликованного урока'}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-muted/45 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Школа</p>
                                    <p className="text-sm font-medium">{tenant.course_count} курсов · {tenant.student_count} студентов</p>
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-1">
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

        <SchoolInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
        </div>
    );
};

const ONBOARDING_STAGE_LABELS: Record<Tenant['onboarding_stage'], string> = {
    invited: 'Ожидает владельца',
    owner_claimed: 'Владелец вошёл',
    group_connected: 'Группа подключена',
    course_created: 'Курс создан',
    lesson_published: 'Урок опубликован',
    launched: 'Школа запущена',
};
