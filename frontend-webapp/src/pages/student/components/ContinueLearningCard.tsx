import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Lock, PlayCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import {
    getCourseAccessLabel,
    getCourseActionLabel,
    getCourseProgress,
    isCourseLocked,
} from './courseStatus';

interface ContinueLearningCardProps {
    course?: StudentCourse;
    onBrowseCourses: () => void;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ course, onBrowseCourses }) => {
    if (!course) {
        return (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                        <BookOpen size={22} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                        <div>
                            <h3 className="font-semibold">Курсов пока нет</h3>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                Когда школа откроет доступ, следующий курс появится здесь.
                            </p>
                        </div>
                        <Button variant="outline" className="rounded-lg" onClick={onBrowseCourses}>
                            Смотреть курсы
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const progress = getCourseProgress(course);
    const isLocked = isCourseLocked(course);
    const cardContent = (
        <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20 sm:grid-cols-[120px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/30">
                {course.cover_url ? (
                    <img src={course.cover_url} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                        <BookOpen size={34} />
                    </div>
                )}
                {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/65">
                        <Lock size={24} className="text-muted-foreground" />
                    </div>
                )}
            </div>

            <div className="min-w-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                            Следующий курс
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">
                            {course.title}
                        </h3>
                    </div>
                    <span
                        className={cn(
                            "shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold",
                            isLocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                        )}
                    >
                        {getCourseAccessLabel(course)}
                    </span>
                </div>

                {course.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {course.description}
                    </p>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>Прогресс</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-primary">
                    <span className="inline-flex items-center gap-2">
                        {isLocked ? <Lock size={16} /> : <PlayCircle size={16} />}
                        {isLocked ? course.lock_reason || 'Доступ закрыт' : getCourseActionLabel(course)}
                    </span>
                    {!isLocked && <ChevronRight size={18} />}
                </div>
            </div>
        </div>
    );

    if (isLocked) {
        return <div aria-label={`Курс ${course.title} заблокирован`}>{cardContent}</div>;
    }

    return (
        <Link to={`/course/${course.id}`} aria-label={`Продолжить курс ${course.title}`}>
            {cardContent}
        </Link>
    );
};
