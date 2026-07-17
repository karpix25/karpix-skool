import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Gem, Lock, PlayCircle } from 'lucide-react';
import { CourseCoverImage } from '../../../components/CourseCoverImage';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { externalLinkRel } from '../../../lib/externalLinks';
import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import {
    getCourseAccessLabel,
    getCourseAccessState,
    getCourseActionLabel,
    getCourseProgress,
    isCourseLocked,
} from './courseStatus';

interface StudentCourseListCardProps {
    course: StudentCourse;
}

export const StudentCourseListCard: React.FC<StudentCourseListCardProps> = ({ course }) => {
    const progress = getCourseProgress(course);
    const access = getCourseAccessState(course);
    const isLocked = isCourseLocked(course);
    const isComplete = progress >= 100;
    const StatusIcon = isLocked ? Lock : access === 'vip' ? Gem : CheckCircle2;

    const cardBody = (
        <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/30">
                {course.cover_url ? (
                    <CourseCoverImage src={course.cover_url} alt={course.title} />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                        <BookOpen size={32} />
                    </div>
                )}
            </div>

            <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-semibold leading-tight">{course.title}</h3>
                        {course.description && (
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                {course.description}
                            </p>
                        )}
                    </div>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold",
                            access === 'locked' && "bg-muted text-muted-foreground",
                            access === 'vip' && "bg-vip/10 text-vip",
                            access === 'open' && "bg-success/10 text-success",
                        )}
                    >
                        <StatusIcon size={12} />
                        {getCourseAccessLabel(course)}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{isComplete ? 'Завершён' : 'Прогресс'}</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress
                        value={progress}
                        className="h-2"
                        indicatorClassName={cn(isComplete && "bg-success")}
                    />
                </div>

                {isLocked ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                            {course.lock_reason || 'Курс пока недоступен.'}
                        </p>
                        {course.is_vip && course.vip_group_link && (
                            <Button asChild variant="outline" className="rounded-lg">
                                <a href={course.vip_group_link} target="_blank" rel={externalLinkRel}>
                                    <Gem size={16} />
                                    VIP доступ
                                </a>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        <PlayCircle size={16} />
                        {getCourseActionLabel(course)}
                    </div>
                )}
            </div>
        </div>
    );

    if (isLocked) {
        return (
            <Card className="overflow-hidden border-border/70 bg-card/80" aria-label={`Курс ${course.title} заблокирован`}>
                {cardBody}
            </Card>
        );
    }

    return (
        <Link
            to={`/course/${course.id}`}
            className="block overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Открыть курс ${course.title}`}
        >
            {cardBody}
        </Link>
    );
};
