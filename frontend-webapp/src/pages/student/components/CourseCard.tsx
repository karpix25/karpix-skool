import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock } from 'lucide-react';
import { buttonVariants } from '../../../components/ui/button-variants';
import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import { getCourseAccessLabel, getCourseActionLabel, getCourseProgress, isCourseLocked } from './courseStatus';

interface CourseCardProps {
    course: StudentCourse;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const progressPercent = getCourseProgress(course);
    const isLocked = isCourseLocked(course);
    const cardClassName = cn(
        "block w-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card transition-colors",
        isLocked
            ? "opacity-80"
            : "group block cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    );
    const actionClassName = cn(
        buttonVariants(),
        "mt-2 h-9 w-full rounded-lg px-3 py-1 text-[11px] font-semibold"
    );

    const cardContent = (
        <>
            <div className="relative h-32 overflow-hidden">
                {course.cover_url ? (
                    <img
                        src={course.cover_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground/50">
                        <BookOpen size={32} />
                    </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/55">
                        <svg className="w-full h-full -rotate-90">
                            <circle className="text-white/20" cx="16" cy="16" fill="transparent" r="14" stroke="currentColor" strokeWidth="3"></circle>
                            <circle
                                className={progressPercent === 100 ? "text-green-500" : "text-primary"}
                                cx="16"
                                cy="16"
                                fill="transparent"
                                r="14"
                                stroke="currentColor"
                                strokeDasharray="88"
                                strokeDashoffset={88 - (88 * progressPercent) / 100}
                                strokeWidth="3"
                                strokeLinecap="round"
                            ></circle>
                        </svg>
                        <span className="absolute text-[8px] font-bold text-white">{progressPercent}%</span>
                    </div>
                </div>
                <div className={cn(
                    "absolute right-3 top-3 rounded-md border border-border/70 bg-background/95 px-2 py-1 text-[10px] font-semibold",
                    isLocked ? "text-muted-foreground" : "text-primary"
                )}>
                    {getCourseAccessLabel(course)}
                </div>
            </div>
            <div className="p-3 space-y-1">
                <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">{course.title}</h3>
                <p className="truncate text-[11px] text-muted-foreground">
                    {course.description || "Начните обучение"}
                </p>
                {isLocked ? (
                    <button
                        type="button"
                        disabled
                        className={actionClassName}
                        aria-label={course.lock_reason || `Курс ${course.title} заблокирован`}
                    >
                        <Lock size={12} />
                        <span className="truncate">{course.lock_reason || 'Закрыто'}</span>
                    </button>
                ) : (
                    <span className={actionClassName}>
                        {getCourseActionLabel(course)}
                    </span>
                )}
            </div>
        </>
    );

    if (isLocked) {
        return (
            <article
                className={cardClassName}
                aria-disabled="true"
                aria-label={`Курс ${course.title} заблокирован`}
            >
                {cardContent}
            </article>
        );
    }

    return (
        <Link
            to={`/course/${course.id}`}
            className={cardClassName}
            aria-label={`Открыть курс ${course.title}`}
        >
            {cardContent}
        </Link>
    );
};
