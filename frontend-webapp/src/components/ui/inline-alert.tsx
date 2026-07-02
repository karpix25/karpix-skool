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
    success: 'border-success/25 bg-success/10 text-success',
    error: 'border-destructive/35 bg-destructive/10 text-destructive',
    info: 'border-primary/25 bg-primary/10 text-primary',
};

const descriptionStyles: Record<InlineAlertVariant, string> = {
    success: 'text-success/80',
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
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
                alertStyles[variant],
                className
            )}
            {...props}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold leading-5">{title}</p>
                {description && (
                    <p className={cn('mt-0.5 text-xs font-medium leading-5 opacity-90', descriptionStyles[variant])}>
                        {description}
                    </p>
                )}
            </div>
            {onDismiss && (
                <button
                    type="button"
                    aria-label="Скрыть сообщение"
                    onClick={onDismiss}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg opacity-70 transition hover:bg-current/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/30"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
