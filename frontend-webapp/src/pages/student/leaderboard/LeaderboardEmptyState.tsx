import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Trophy } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

interface LeaderboardEmptyStateProps {
    title: string;
    description: string;
    variant?: 'empty' | 'error';
    icon?: LucideIcon;
    className?: string;
}

export const LeaderboardEmptyState: React.FC<LeaderboardEmptyStateProps> = ({
    title,
    description,
    variant = 'empty',
    icon,
    className,
}) => {
    const Icon = icon || (variant === 'error' ? AlertCircle : Trophy);

    return (
        <Card
            role={variant === 'error' ? 'alert' : 'status'}
            aria-live={variant === 'error' ? 'assertive' : 'polite'}
            className={cn('flex flex-col items-center justify-center px-5 py-12 text-center', className)}
        >
            <div
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl border',
                    variant === 'error'
                        ? 'border-destructive/25 bg-destructive/10 text-destructive'
                        : 'border-border/70 bg-muted/55 text-muted-foreground'
                )}
            >
                <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold leading-tight">{title}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </Card>
    );
};
