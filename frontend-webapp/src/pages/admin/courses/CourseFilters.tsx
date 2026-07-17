import { cn } from '../../../lib/utils';
import { filters, getFilterLabel } from './courseOptions';
import type { FilterType } from './types';

interface CourseFiltersProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export const CourseFilters = ({ activeFilter, onFilterChange }: CourseFiltersProps) => (
    <div
        className="px-5 sm:px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth"
        role="group"
        aria-label="Фильтр курсов"
    >
        {filters.map((filter) => (
            <button
                key={filter}
                type="button"
                aria-pressed={activeFilter === filter}
                onClick={() => onFilterChange(filter)}
                className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border",
                    activeFilter === filter
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/20"
                )}
            >
                {getFilterLabel(filter)}
            </button>
        ))}
    </div>
);
