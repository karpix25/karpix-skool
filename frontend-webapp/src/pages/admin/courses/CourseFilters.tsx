import { cn } from '../../../lib/utils';
import { filters, getFilterLabel } from './courseOptions';
import type { FilterType } from './types';

interface CourseFiltersProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export const CourseFilters = ({ activeFilter, onFilterChange }: CourseFiltersProps) => (
    <div className="px-6 py-4 flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth">
        {filters.map((filter) => (
            <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={cn(
                    "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                    activeFilter === filter
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
            >
                {getFilterLabel(filter)}
            </button>
        ))}
    </div>
);
