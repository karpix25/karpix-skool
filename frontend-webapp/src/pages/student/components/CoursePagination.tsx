import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../../../lib/utils';

interface CoursePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const CoursePagination: React.FC<CoursePaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
}) => {
    if (totalPages <= 1) return null;

    const canGoBack = currentPage > 1;
    const canGoForward = currentPage < totalPages;

    const goToPrevious = () => {
        if (canGoBack) onPageChange(currentPage - 1);
    };

    const goToNext = () => {
        if (canGoForward) onPageChange(currentPage + 1);
    };

    return (
        <nav
            className="flex items-center justify-center gap-3 pt-1"
            aria-label="Страницы курсов"
        >
            <button
                type="button"
                onClick={goToPrevious}
                disabled={!canGoBack}
                className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors",
                    canGoBack ? "hover:bg-muted/50 hover:text-foreground" : "cursor-not-allowed opacity-45",
                )}
                aria-label="Предыдущая страница курсов"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-sm font-semibold text-muted-foreground">
                {currentPage} / {totalPages}
            </span>
            <button
                type="button"
                onClick={goToNext}
                disabled={!canGoForward}
                className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors",
                    canGoForward ? "hover:bg-muted/50 hover:text-foreground" : "cursor-not-allowed opacity-45",
                )}
                aria-label="Следующая страница курсов"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </nav>
    );
};
