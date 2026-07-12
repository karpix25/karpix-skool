import { Activity, AlertCircle, Building2, Clock3, RefreshCw, UserPlus, Users } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { AppUser, SuperActivityItem, SuperAdminLead, Tenant } from './types';

interface TerminalTabProps {
    tenants: Tenant[];
    users: AppUser[];
    applications: SuperAdminLead[];
    activity: SuperActivityItem[];
    isActivityLoading: boolean;
    activityError: string | null;
    onRefreshActivity: () => void;
    time: string;
}

const activityTone: Record<SuperActivityItem['tone'], string> = {
    success: 'bg-success/10 text-success border-success/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
};

const activityLabels: Record<SuperActivityItem['type'], string> = {
    school: 'Школа',
    lead: 'Заявка',
    author: 'Автор',
    student: 'Ученик',
    learning: 'Урок',
    generation: 'AI',
    system: 'Система',
};

const pendingStatuses = new Set(['new', 'pending']);

const formatActivityTime = (value: string | null) => {
    if (!value) return 'без времени';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const TerminalTab = ({
    tenants,
    users,
    applications,
    activity,
    isActivityLoading,
    activityError,
    onRefreshActivity,
    time,
}: TerminalTabProps) => {
    const studentsCount = tenants.reduce((acc, tenant) => acc + tenant.member_count, 0);
    const authorApplicationsCount = applications.filter((item) => item.kind === 'author_request' && pendingStatuses.has(item.status)).length;
    const authorPendingCount = authorApplicationsCount || users.filter((user) => user.admin_status === 'pending').length;
    const leadPendingCount = applications.filter((item) => item.kind === 'platform_lead' && pendingStatuses.has(item.status)).length;
    const pendingCount = authorPendingCount + leadPendingCount;
    const activeSchools = tenants.filter((tenant) => tenant.subscription_status === 'active').length;

    const stats = [
        { label: 'Ученики', value: studentsCount, detail: 'во всех школах', icon: Users },
        { label: 'Школы', value: tenants.length, detail: `${activeSchools} активных`, icon: Building2 },
        { label: 'Заявки', value: pendingCount, detail: `${authorPendingCount} авторов · ${leadPendingCount} лидов`, icon: UserPlus },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Обзор платформы</p>
                        <h2 className="mt-1 text-2xl font-semibold leading-tight">Система</h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-success/20 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                        <Activity className="h-3.5 w-3.5" />
                        99.9%
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {stats.map((stat) => (
                        <div key={stat.label} className="min-w-0 rounded-xl border border-border/70 bg-background/65 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-medium text-muted-foreground">{stat.label}</span>
                                <stat.icon className="h-4 w-4 shrink-0 text-primary" />
                            </div>
                            <p className="font-mono text-xl font-semibold leading-none">{stat.value}</p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                        <h3 className="text-base font-semibold">Последние события</h3>
                        <p className="text-xs text-muted-foreground">Системные изменения и модерация</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {time.split(' ')[0].slice(0, 5)}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg"
                            onClick={onRefreshActivity}
                            disabled={isActivityLoading}
                            aria-label="Обновить события"
                            title="Обновить события"
                        >
                            <RefreshCw className={cn('h-4 w-4', isActivityLoading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                <div className="divide-y divide-border/70">
                    {activityError && (
                        <div className="flex items-start gap-3 px-4 py-4 text-sm text-danger">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-semibold">События не загрузились</p>
                                <p className="mt-1 text-xs text-muted-foreground">{activityError}</p>
                            </div>
                        </div>
                    )}

                    {isActivityLoading && activity.length === 0 && (
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="flex gap-3 px-4 py-3">
                                <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                </div>
                            </div>
                        ))
                    )}

                    {!activityError && !isActivityLoading && activity.length === 0 && (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm font-semibold">Пока нет событий</p>
                            <p className="mt-1 text-xs text-muted-foreground">Новые школы, заявки и действия модерации появятся здесь.</p>
                        </div>
                    )}

                    {activity.map((item) => (
                        <article key={item.id} className="flex gap-3 px-4 py-3">
                            <span className={cn('mt-0.5 inline-flex h-7 min-w-20 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold', activityTone[item.tone])}>
                                {activityLabels[item.type]}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-5 text-foreground">{item.title}</p>
                                <p className="mt-0.5 break-words text-sm leading-5 text-muted-foreground">{item.message}</p>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{formatActivityTime(item.occurredAt)}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};
