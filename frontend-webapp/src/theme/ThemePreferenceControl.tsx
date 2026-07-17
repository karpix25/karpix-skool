import { Moon, Monitor, Smartphone, Sun, type LucideIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { useThemePreference } from './useThemePreference';
import type { ThemePreference } from './themePreference';

interface ThemePreferenceOption {
    value: ThemePreference;
    label: string;
    icon: LucideIcon;
}

const themePreferenceOptions: readonly ThemePreferenceOption[] = [
    { value: 'telegram', label: 'Telegram', icon: Smartphone },
    { value: 'system', label: 'Система', icon: Monitor },
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
];

interface ThemePreferenceControlProps {
    compact?: boolean;
    className?: string;
}

export const ThemePreferenceControl = ({
    compact = false,
    className,
}: ThemePreferenceControlProps) => {
    const { preference, setPreference } = useThemePreference();

    return (
        <div className={cn('space-y-2', className)}>
            {!compact && (
                <div className="px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Тема</p>
                </div>
            )}
            <div
                className={cn(
                    'grid rounded-lg border border-border/70 bg-muted/30 p-1',
                    compact ? 'grid-cols-4' : 'grid-cols-2 gap-1 min-[420px]:grid-cols-4',
                )}
                role="group"
                aria-label="Тема интерфейса"
            >
                {themePreferenceOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = preference === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={isActive}
                            title={option.label}
                            onClick={() => setPreference(option.value)}
                            className={cn(
                                'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-[background-color,color,box-shadow,border-color]',
                                isActive
                                    ? 'border border-border bg-card text-primary shadow-sm ring-1 ring-ring/15'
                                    : 'hover:bg-accent/60 hover:text-foreground',
                                compact && 'px-1',
                            )}
                        >
                            <Icon size={15} aria-hidden="true" />
                            {!compact && <span>{option.label}</span>}
                            {compact && <span className="sr-only">{option.label}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
