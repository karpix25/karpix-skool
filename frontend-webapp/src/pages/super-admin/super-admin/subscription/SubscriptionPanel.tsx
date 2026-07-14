import { useState } from 'react';
import { CalendarDays, Pencil, RefreshCw, Sparkles, UsersRound } from 'lucide-react';

import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { InlineAlert } from '../../../../components/ui/inline-alert';
import { Skeleton } from '../../../../components/ui/skeleton';
import type { Tenant } from '../types';
import { SubscriptionUpdateDialog } from './SubscriptionUpdateDialog';
import { SUBSCRIPTION_STATUS_LABELS } from './types';
import { useTenantSubscription } from './useTenantSubscription';

const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value))
    : 'Без даты';

const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 ГБ';
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(bytes / 1_073_741_824)} ГБ`;
};

interface SubscriptionPanelProps {
    tenant: Tenant | null;
}

export const SubscriptionPanel = ({ tenant }: SubscriptionPanelProps) => {
    const [updateOpen, setUpdateOpen] = useState(false);
    const subscriptionState = useTenantSubscription(tenant?.id || null);

    if (!tenant) {
        return (
            <section className="rounded-2xl border border-dashed border-border bg-card p-5">
                <h3 className="text-base font-semibold">Подписка школы</h3>
                <p className="mt-1 text-sm text-muted-foreground">Выберите школу в списке, чтобы увидеть тариф и лимиты.</p>
            </section>
        );
    }

    if (subscriptionState.isLoading) {
        return (
            <section aria-label="Загрузка подписки" className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
            </section>
        );
    }

    if (!subscriptionState.subscription) {
        return (
            <section className="rounded-2xl border border-border/80 bg-card p-5">
                <InlineAlert
                    variant="error"
                    title="Подписка недоступна"
                    description={subscriptionState.error || 'Для этой школы не найдена подписка.'}
                />
                <Button variant="outline" className="mt-3" onClick={() => void subscriptionState.reload()}>
                    <RefreshCw aria-hidden="true" /> Повторить
                </Button>
            </section>
        );
    }

    const { subscription } = subscriptionState;
    const limits = [
        {
            label: 'Курсы',
            used: subscription.usage.courses_used,
            limit: subscription.plan.max_courses,
            icon: CalendarDays,
        },
        {
            label: 'Ученики',
            used: subscription.usage.students_used,
            limit: subscription.plan.max_students,
            icon: UsersRound,
        },
        {
            label: 'AI-задачи / мес.',
            used: subscription.usage.ai_jobs_used,
            limit: subscription.plan.max_ai_jobs_per_month,
            icon: Sparkles,
        },
        {
            label: 'Хранилище',
            used: formatStorage(subscription.usage.storage_bytes_used),
            limit: formatStorage(subscription.plan.max_storage_bytes),
            icon: RefreshCw,
        },
    ];

    return (
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Подписка · {tenant.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">{subscription.plan.name}</h3>
                        <Badge variant="outline">{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Доступ до {formatDate(subscription.current_period_end || subscription.trial_ends_at)}
                    </p>
                </div>
                <Button variant="outline" onClick={() => setUpdateOpen(true)} className="w-full whitespace-nowrap sm:w-auto">
                    <Pencil aria-hidden="true" /> Изменить вручную
                </Button>
            </div>

            {subscription.blocking_reason && (
                <InlineAlert variant="error" title="Доступ ограничен" description={subscription.blocking_reason} />
            )}
            {subscriptionState.successMessage && (
                <InlineAlert variant="success" title="Подписка обновлена" description={subscriptionState.successMessage} />
            )}

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {limits.map(({ label, used, limit, icon: Icon }) => (
                    <div key={label} className="min-w-0 rounded-xl border border-border/70 bg-muted/35 p-3">
                        <Icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <p className="break-words text-lg font-semibold">{used} / {limit}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                    </div>
                ))}
            </div>

            {updateOpen && (
                <SubscriptionUpdateDialog
                    open
                    onOpenChange={setUpdateOpen}
                    subscription={subscription}
                    plans={subscriptionState.plans}
                    isSaving={subscriptionState.isSaving}
                    error={subscriptionState.error}
                    onSave={subscriptionState.updateSubscription}
                />
            )}
        </section>
    );
};
