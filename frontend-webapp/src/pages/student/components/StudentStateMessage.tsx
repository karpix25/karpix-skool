import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface StudentStateMessageProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const StudentStateMessage: React.FC<StudentStateMessageProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
}) => (
    <div
        className={cn(
            "flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center",
            className,
        )}
    >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
            <Icon size={24} />
        </div>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {description && (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {description}
            </p>
        )}
        {actionLabel && onAction && (
            <Button className="mt-5 rounded-xl" onClick={onAction}>
                {actionLabel}
            </Button>
        )}
    </div>
);
