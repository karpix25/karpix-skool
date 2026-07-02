import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '../../lib/utils';

export type InlineAlertVariant = 'success' | 'error' | 'info';

interface InlineAlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    variant?: InlineAlertVariant;
    title: ReactNode;
    description?: ReactNode;
    onDismiss?: () => void;
}

const alertIcons: Record<InlineAlertVariant, ComponentType<{ className?: string }>> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

const alertStyles: Record<InlineAlertVariant, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50',
    error: 'border-destructive/35 bg-destructive/10 text-destructive',
    info: 'border-primary/25 bg-primary/10 text-primary',
};

const descriptionStyles: Record<InlineAlertVariant, string> = {
    success: 'text-emerald-900/75 dark:text-emerald-50/75',
    error: 'text-destructive/80',
    info: 'text-primary/80',
};

export const InlineAlert = ({
    variant = 'info',
    title,
    description,
    onDismiss,
    className,
    ...props
}: InlineAlertProps) => {
    const Icon = alertIcons[variant];

    return (
        <div
            role={variant === 'error' ? 'alert' : 'status'}
            aria-live={variant === 'error' ? 'assertive' : 'polite'}
            className={cn(
                'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm',
                alertStyles[variant],
                className
            )}
            {...props}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="font-bold leading-5">{title}</p>
                {description && (
                    <p className={cn('mt-0.5 text-xs font-medium leading-5', descriptionStyles[variant])}>
                        {description}
                    </p>
                )}
            </div>
            {onDismiss && (
                <button
                    type="button"
                    aria-label="Скрыть сообщение"
                    onClick={onDismiss}
                    className="rounded-full p-1 opacity-70 transition hover:bg-current/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/30"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
