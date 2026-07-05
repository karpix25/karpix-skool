import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, BellRing, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { getApiErrorMessage } from '../../../services/apiError';
import {
    getCourseSubscription,
    subscribeToCourse,
    unsubscribeFromCourse,
    type CourseSubscriptionState,
} from '../../../services/courseSubscriptions';

type CourseSubscriptionStatus = 'loading' | 'ready' | 'updating' | 'error';
type CourseSubscriptionIntent = 'subscribe' | 'unsubscribe' | null;

export interface CourseSubscriptionActions {
    getStatus: (courseId: string) => Promise<CourseSubscriptionState>;
    subscribe: (courseId: string) => Promise<CourseSubscriptionState>;
    unsubscribe: (courseId: string) => Promise<CourseSubscriptionState>;
}

interface CourseSubscriptionButtonProps {
    courseId: string;
    actions?: CourseSubscriptionActions;
    className?: string;
}

const defaultActions: CourseSubscriptionActions = {
    getStatus: getCourseSubscription,
    subscribe: subscribeToCourse,
    unsubscribe: unsubscribeFromCourse,
};

const getButtonLabel = (
    status: CourseSubscriptionStatus,
    isSubscribed: boolean,
    intent: CourseSubscriptionIntent,
) => {
    if (status === 'loading') return 'Проверяем';
    if (status === 'error') return 'Повторить';
    if (status === 'updating') return intent === 'unsubscribe' ? 'Выключаем' : 'Включаем';
    return isSubscribed ? 'Уведомления включены' : 'Уведомлять';
};

const getAriaLabel = (status: CourseSubscriptionStatus, isSubscribed: boolean) => {
    if (status === 'loading') return 'Проверяем состояние Telegram-уведомлений курса';
    if (status === 'error') return 'Повторить загрузку состояния уведомлений курса';
    return isSubscribed
        ? 'Отключить Telegram-уведомления курса'
        : 'Включить Telegram-уведомления о новых уроках курса';
};

export const CourseSubscriptionButton: React.FC<CourseSubscriptionButtonProps> = ({
    courseId,
    actions = defaultActions,
    className,
}) => {
    const [subscription, setSubscription] = useState<CourseSubscriptionState | null>(null);
    const [status, setStatus] = useState<CourseSubscriptionStatus>('loading');
    const [intent, setIntent] = useState<CourseSubscriptionIntent>(null);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(false);

    const isSubscribed = subscription?.is_subscribed ?? false;
    const { getStatus, subscribe, unsubscribe } = actions;

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            requestIdRef.current += 1;
        };
    }, []);

    const loadStatus = useCallback(async (requestId: number) => {
        try {
            const nextSubscription = await getStatus(courseId);
            if (!isMountedRef.current || requestIdRef.current !== requestId) return;
            setSubscription(nextSubscription);
            setStatus('ready');
        } catch (loadError) {
            if (!isMountedRef.current || requestIdRef.current !== requestId) return;
            setError(getApiErrorMessage(loadError, 'Не удалось загрузить уведомления курса.'));
            setStatus('error');
        }
    }, [courseId, getStatus]);

    useEffect(() => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        queueMicrotask(() => {
            if (!isMountedRef.current || requestIdRef.current !== requestId) return;
            setStatus('loading');
            setIntent(null);
            setError(null);
        });
        void loadStatus(requestId);
    }, [loadStatus]);

    const handleClick = async () => {
        if (status === 'loading' || status === 'updating') return;
        if (status === 'error') {
            const requestId = requestIdRef.current + 1;
            requestIdRef.current = requestId;
            setStatus('loading');
            setIntent(null);
            setError(null);
            await loadStatus(requestId);
            return;
        }

        const nextIntent: CourseSubscriptionIntent = isSubscribed ? 'unsubscribe' : 'subscribe';
        setStatus('updating');
        setIntent(nextIntent);
        setError(null);

        try {
            const nextSubscription = await (isSubscribed ? unsubscribe : subscribe)(courseId);
            if (!isMountedRef.current) return;
            setSubscription(nextSubscription);
            setStatus('ready');
            setIntent(null);
        } catch (updateError) {
            if (!isMountedRef.current) return;
            setError(getApiErrorMessage(updateError, 'Не удалось обновить уведомления курса.'));
            setStatus('error');
        }
    };

    const label = getButtonLabel(status, isSubscribed, intent);
    const ariaLabel = getAriaLabel(status, isSubscribed);
    const isBusy = status === 'loading' || status === 'updating';
    const Icon = isBusy ? Loader2 : status === 'error' ? AlertCircle : isSubscribed ? BellRing : Bell;

    return (
        <div className="flex flex-col items-stretch gap-2 min-[420px]:items-end">
            <Button
                type="button"
                variant={isSubscribed ? 'secondary' : 'outline'}
                aria-label={ariaLabel}
                aria-busy={isBusy}
                disabled={isBusy}
                onClick={handleClick}
                className={cn(
                    "h-10 min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold",
                    status === 'error' && "border-destructive/40 text-destructive hover:bg-destructive/5",
                    isSubscribed && status === 'ready' && "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
                    className,
                )}
            >
                <Icon className={cn(isBusy && "animate-spin")} size={16} />
                <span aria-hidden="true">{label}</span>
            </Button>
            {error && (
                <p role="alert" className="max-w-60 text-xs font-medium leading-snug text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};
