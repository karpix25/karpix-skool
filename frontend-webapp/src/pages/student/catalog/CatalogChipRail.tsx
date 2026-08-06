import React from 'react';

import { HorizontalRail } from '../../../components/ui/horizontal-rail';
import { cn } from '../../../lib/utils';

export interface CatalogChipOption {
    label: string;
    value: string;
}

interface CatalogChipRailProps {
    label: string;
    ariaLabel: string;
    options: CatalogChipOption[];
    value: string;
    onChange: (value: string) => void;
}

export const CatalogChipRail: React.FC<CatalogChipRailProps> = ({
    label,
    ariaLabel,
    options,
    value,
    onChange,
}) => (
    <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
        </p>
        <HorizontalRail
            role="group"
            aria-label={ariaLabel}
            className="-mx-1 px-1"
            contentClassName="gap-2"
        >
            {options.map((option) => {
                const isActive = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'min-h-9 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                            isActive
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border/70 bg-card/80 text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </HorizontalRail>
    </div>
);
