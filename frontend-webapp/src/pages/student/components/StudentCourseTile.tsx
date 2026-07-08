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
    const StatusIcon = statusIconByAccess[access];

    const body = (
        <>
            <div className="relative aspect-square overflow-hidden bg-muted/40">
                {course.cover_url ? (
                    <CourseCoverImage src={course.cover_url} alt={course.title} loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/45">
                        <BookOpen size={24} />
                    </div>
                )}
                <CourseLockOverlay course={course} />
                {!isLocked && (
                    <span
                        className={cn(
                            "absolute right-1.5 top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-card/95 px-1.5 text-[10px] font-semibold backdrop-blur",
                            access === 'vip' && "border-amber-500/25 bg-amber-500/10 text-amber-700/80",
                            access === 'open' && "border-green-500/20 text-green-600",
                        )}
                        aria-label={getCourseAccessLabel(course)}
                    >
                        <StatusIcon size={12} />
                    </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                    <span
                        className={cn("block h-full bg-primary", progress >= 100 && "bg-green-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
            <div className="min-w-0 space-y-1 p-2">
                <h3 className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 text-foreground [overflow-wrap:anywhere]">
                    {course.title}
                </h3>
                <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-muted-foreground">
                    <span className="truncate">{progress >= 100 ? 'Готово' : `${progress}%`}</span>
                    {course.is_vip && <span className="shrink-0 text-amber-700">VIP</span>}
                </div>
            </div>
        </>
    );

    const className = cn(
        "block min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
        isLocked
            ? "opacity-75"
            : "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
