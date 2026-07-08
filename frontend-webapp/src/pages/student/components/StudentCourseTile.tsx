import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Lock } from 'lucide-react';

import { CourseCoverImage } from '../../../components/CourseCoverImage';
import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import { CourseLockOverlay } from './CourseLockOverlay';
import {
    getCourseAccessLabel,
    getCourseAccessState,
    getCourseProgress,
    isCourseLocked,
} from './courseStatus';

interface StudentCourseTileProps {
    course: StudentCourse;
}

const statusIconByAccess = {
    locked: Lock,
    vip: Lock,
    open: CheckCircle2,
};

export const StudentCourseTile: React.FC<StudentCourseTileProps> = ({ course }) => {
    const progress = getCourseProgress(course);
    const access = getCourseAccessState(course);
    const isLocked = isCourseLocked(course);
    const isComplete = progress >= 100;
    const StatusIcon = statusIconByAccess[access];
    const progressLabel = isComplete ? 'Готово' : `${progress}%`;

    const body = (
        <>
            <div className="relative aspect-square overflow-hidden border-b border-border/70 bg-muted/40 lg:aspect-[16/9]">
                {course.cover_url ? (
                    <CourseCoverImage src={course.cover_url} alt={course.title} fit="contain" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/45">
                        <BookOpen className="h-6 w-6 lg:h-10 lg:w-10" />
                    </div>
                )}
                <CourseLockOverlay course={course} />
                {!isLocked && (
                    <span
                        className={cn(
                            "absolute right-1.5 top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-card/95 px-1.5 text-[10px] font-semibold backdrop-blur lg:right-3 lg:top-3 lg:h-9 lg:min-w-9 lg:rounded-lg lg:px-2.5",
                            access === 'vip' && "border-amber-500/25 bg-amber-500/10 text-amber-700/80",
                            access === 'open' && "border-green-500/20 text-green-600",
                        )}
                        aria-label={getCourseAccessLabel(course)}
                    >
                        <StatusIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                    </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10 lg:hidden">
                    <span
                        className={cn("block h-full bg-primary", isComplete && "bg-green-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-2 lg:min-h-[152px] lg:gap-4 lg:p-4 xl:min-h-[168px] xl:p-5">
                <div className="min-w-0 space-y-1 lg:space-y-2">
                    <h3 className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 text-foreground [overflow-wrap:anywhere] lg:min-h-[3.5rem] lg:text-xl lg:leading-7">
                        {course.title}
                    </h3>
                    {course.description && (
                        <p className="hidden line-clamp-2 text-sm leading-6 text-muted-foreground lg:block xl:text-[15px]">
                            {course.description}
                        </p>
                    )}
                </div>
                <div className="space-y-2 lg:space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground lg:text-sm">
                        <span className="truncate">{progressLabel}</span>
                        {course.is_vip && <span className="shrink-0 text-amber-700">VIP</span>}
                    </div>
                    <div className="hidden h-2.5 overflow-hidden rounded-full bg-muted lg:block">
                        <span
                            className={cn("block h-full rounded-full bg-primary", isComplete && "bg-green-500")}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </>
    );

    const className = cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,transform] duration-150 lg:rounded-xl",
        isLocked
            ? "opacity-75"
            : "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hover:-translate-y-0.5 lg:hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
    );

    if (isLocked) {
        return (
            <article
                className={className}
                aria-disabled="true"
                aria-label={`Курс ${course.title} заблокирован`}
            >
                {body}
            </article>
        );
    }

    return (
        <Link to={`/course/${course.id}`} className={className} aria-label={`Открыть курс ${course.title}`}>
            {body}
        </Link>
    );
};
