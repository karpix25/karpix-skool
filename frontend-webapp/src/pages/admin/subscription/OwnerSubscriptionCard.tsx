import { AlertTriangle, Bot, BookOpen, CalendarDays, Database, ExternalLink, RefreshCw, Users } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Skeleton } from '../../../components/ui/skeleton';
import { OWNER_SUBSCRIPTION_LABELS } from './types';
import { useOwnerSubscription } from './useOwnerSubscription';

interface OwnerSubscriptionCardProps {
    tenantId: string;
    supportUrl?: string | null;
}

const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(value))
    : 'дата не указана';

const formatStorage = (bytes: number) => {
    const gigabytes = bytes / 1_073_741_824;
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(gigabytes)} ГБ`;
};

export const OwnerSubscriptionCard = ({ tenantId, supportUrl }: OwnerSubscriptionCardProps) => {
    const state = useOwnerSubscription(tenantId);

    if (state.isLoading) {
        return (
            <Card aria-label="Загрузка тарифа" className="rounded-2xl border-border shadow-sm">
                <CardContent className="space-y-3 p-5">
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!state.subscription) {
        return (
            <Card className="rounded-2xl border-border shadow-sm">
                <CardContent className="p-5">
                    <InlineAlert variant="error" title="Тариф не загружен" description={state.error || 'Подписка школы не найдена.'} />
                    <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => void state.reload()}>
                        <RefreshCw aria-hidden="true" /> Повторить
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const subscription = state.subscription;
    const accessEnd = subscription.status === 'trialing'
        ? subscription.trial_ends_at
        : subscription.current_period_end;
    const limits = [
        { label: 'Курсы', used: subscription.usage.courses_used, limit: subscription.plan.max_courses, icon: BookOpen },
        { label: 'Ученики', used: subscription.usage.students_used, limit: subscription.plan.max_students, icon: Users },
        { label: 'AI за месяц', used: subscription.usage.ai_jobs_used, limit: subscription.plan.max_ai_jobs_per_month, icon: Bot },
        { label: 'Хранилище', used: formatStorage(subscription.usage.storage_bytes_used), limit: formatStorage(subscription.plan.max_storage_bytes), icon: Database },
    ];

    return (
        <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="space-y-3 p-5 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Тариф школы</p>
                        <CardTitle className="mt-1 text-xl">{subscription.plan.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="w-fit">{OWNER_SUBSCRIPTION_LABELS[subscription.status]}</Badge>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {subscription.status === 'trialing' ? 'Пробный доступ до' : 'Доступ до'} {formatDate(accessEnd)}
                </p>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-1">
                {!subscription.is_write_allowed && (
                    <InlineAlert
                        variant="error"
                        title="Школа работает только для чтения"
                        description="Контент и данные сохранены, но публикация, загрузки и AI временно недоступны. Продлите доступ через ручное подтверждение оплаты."
                    />
                )}

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {limits.map(({ label, used, limit, icon: Icon }) => (
                        <div key={label} className="min-w-0 rounded-xl border border-border/70 bg-muted/35 p-3">
                            <Icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <p className="break-words text-base font-semibold">{used} / {limit}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-border bg-muted/25 p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">Оплата подтверждается вручную</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Для продления сообщите поддержке название школы. После подтверждения новый срок появится здесь автоматически.
                            </p>
                            {supportUrl && (
                                <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground">
                                    Связаться с поддержкой <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
