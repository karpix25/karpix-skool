import { Activity, AlertCircle, Globe, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import type { SuperActivityItem, Tenant } from './types';

interface MySchoolTabProps {
    school: Tenant | null;
    tenants: Tenant[];
    selectedTenantId: string | null;
    onSelectTenant: (tenantId: string) => void;
    activity: SuperActivityItem[];
    isActivityLoading: boolean;
    activityError: string | null;
    onRefreshActivity: () => void;
}

const TenantSelector = ({
    tenants,
    selectedTenantId,
    onSelectTenant,
}: Pick<MySchoolTabProps, 'tenants' | 'selectedTenantId' | 'onSelectTenant'>) => (
    <Select value={selectedTenantId || ''} onValueChange={onSelectTenant}>
        <SelectTrigger className="h-11 w-full rounded-lg border border-border bg-background text-sm sm:w-72">
            <SelectValue placeholder="Выбрать школу" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-border shadow-md">
            {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id} className="text-sm">
                    {tenant.name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const activityTone: Record<SuperActivityItem['tone'], string> = {
    success: 'bg-success',
    info: 'bg-primary',
    warning: 'bg-vip',
    danger: 'bg-danger',
};

const formatActivityTime = (value: string | null) => {
    if (!value) return 'Без времени';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const MySchoolTab = ({
    school,
    tenants,
    selectedTenantId,
    onSelectTenant,
    activity,
    isActivityLoading,
    activityError,
    onRefreshActivity,
}: MySchoolTabProps) => {
    const schoolActivity = school
        ? activity.filter((item) => item.tenantName === school.name).slice(0, 5)
        : [];

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {school ? (
            <>
                <header className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
                                {school.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">Активная школа</p>
                                <h2 className="truncate text-2xl font-semibold leading-tight">{school.name}</h2>
                            </div>
                        </div>
                        <TenantSelector
                            tenants={tenants}
                            selectedTenantId={selectedTenantId}
                            onSelectTenant={onSelectTenant}
                        />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                        <span className="font-medium text-foreground">Статус: {school.subscription_status === 'active' ? 'активна' : 'приостановлена'}</span>
                        <span className="text-muted-foreground">
                            Владелец: {school.owner_username ? `@${school.owner_username}` : 'не назначен'}
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-2">
                    <Card className="rounded-2xl border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <p className="text-xs font-medium text-muted-foreground">Студенты</p>
                        <p className="mt-2 font-mono text-2xl font-semibold">{school.member_count}</p>
                    </Card>
                    <Card className="rounded-2xl border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <p className="text-xs font-medium text-muted-foreground">Курсы</p>
                        <p className="mt-2 font-mono text-2xl font-semibold">{school.course_count}</p>
                    </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Card className="flex flex-col justify-between rounded-2xl border border-dashed border-primary/25 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                    <Globe size={16} className="text-primary" aria-hidden="true" />
                                </div>
                                <h4 className="text-sm font-semibold">Интеграция Telegram</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                                {school.telegram_group_id
                                    ? 'Telegram-группа сохранена в настройках школы.'
                                    : 'Telegram-группа для этой школы пока не настроена.'}
                            </p>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                            <span className="text-xs text-muted-foreground">Подключение</span>
                            <span className={cn(
                                'text-xs font-semibold',
                                school.telegram_group_id ? 'text-success' : 'text-muted-foreground'
                            )}>
                                {school.telegram_group_id ? 'Настроено' : 'Не настроено'}
                            </span>
                        </div>
                    </Card>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold">События школы</h4>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                onClick={onRefreshActivity}
                                disabled={isActivityLoading}
                                aria-label="Обновить события школы"
                            >
                                <RefreshCw className={cn('h-4 w-4', isActivityLoading && 'animate-spin')} aria-hidden="true" />
                            </Button>
                        </div>
                        {activityError && (
                            <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{activityError}</span>
                            </div>
                        )}
                        {!activityError && isActivityLoading && schoolActivity.length === 0 && (
                            <p role="status" className="text-xs text-muted-foreground">Загружаем события…</p>
                        )}
                        {!activityError && !isActivityLoading && schoolActivity.length === 0 && (
                            <p className="text-xs leading-5 text-muted-foreground">Для этой школы пока нет записанных событий.</p>
                        )}
                        {!activityError && schoolActivity.length > 0 && (
                            <div className="space-y-4">
                                {schoolActivity.map((item) => (
                                    <article key={item.id} className="flex items-start gap-3">
                                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', activityTone[item.tone])} aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="break-words text-xs font-medium leading-relaxed text-foreground">{item.title}</p>
                                            <p className="mt-0.5 break-words text-xs text-muted-foreground">{item.message}</p>
                                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{formatActivityTime(item.occurredAt)}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center text-muted-foreground">
                <Activity size={40} className="mx-auto mb-4" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Школа не выбрана</p>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5">
                    Выберите школу, чтобы открыть её показатели, интеграцию и журнал событий.
                </p>
                <div className="mx-auto mt-5 flex max-w-sm justify-center">
                    <TenantSelector
                        tenants={tenants}
                        selectedTenantId={selectedTenantId}
                        onSelectTenant={onSelectTenant}
                    />
                </div>
            </div>
        )}
        </div>
    );
};
