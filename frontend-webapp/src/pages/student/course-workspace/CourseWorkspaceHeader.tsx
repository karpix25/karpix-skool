import React from 'react';
import { ChevronLeft, ListChecks } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import { CourseSubscriptionButton } from '../components/CourseSubscriptionButton';

interface CourseWorkspaceHeaderProps {
    course: StudentCourse;
    progressPercent: number;
    onBack: () => void;
    onOpenContents: () => void;
    showContentsButton?: boolean;
}

export const CourseWorkspaceHeader: React.FC<CourseWorkspaceHeaderProps> = ({
    course,
    progressPercent,
    onBack,
    onOpenContents,
    showContentsButton = true,
}) => {
    const isComplete = progressPercent >= 100;

    return (
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
            <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-3 py-2 min-[380px]:px-4 lg:px-6">
                <Button variant="ghost" size="icon" aria-label="Вернуться к списку курсов" onClick={onBack}>
                    <ChevronLeft size={22} />
                </Button>

                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                        <h1 className="min-w-0 truncate text-sm font-semibold text-foreground min-[380px]:text-base">
                            {course.title || 'Курс'}
                        </h1>
                        <span className={cn('shrink-0 text-xs font-semibold', isComplete ? 'text-success' : 'text-primary')}>
                            {progressPercent}%
                        </span>
                    </div>
                    <Progress
                        value={progressPercent}
                        aria-label={`Прогресс курса ${course.title}`}
                        className="h-1.5 bg-muted/70"
                        indicatorClassName={cn(isComplete && 'bg-success')}
                    />
                </div>

                {showContentsButton && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 lg:hidden"
                        aria-label="Открыть содержание курса"
                        onClick={onOpenContents}
                    >
                        <ListChecks size={18} />
                    </Button>
                )}

                <CourseSubscriptionButton courseId={course.id} className="hidden shrink-0 lg:inline-flex" />
            </div>
        </header>
    );
};
