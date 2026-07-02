import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, ChevronLeft, Lock, CheckCircle, PlayCircle, ChevronRight, Gem, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';
import { getApiErrorMessage } from '../../services/apiError';
import type { CourseDetailData } from '../../types/course';
import { StudentStateMessage } from './components/StudentStateMessage';

interface CourseDetailLoadState {
    courseId?: string;
    data: CourseDetailData | null;
    error: string | null;
    status: 'loading' | 'loaded' | 'error';
}

export const CourseDetail: React.FC = () => {
    const { id } = useParams();
    const [loadState, setLoadState] = useState<CourseDetailLoadState>({
        data: null,
        error: null,
        status: 'loading',
    });
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        api.get<CourseDetailData>(`/webapp/courses/${id}`)
            .then(res => {
                if (isMounted) {
                    setLoadState({ courseId: id, data: res.data, error: null, status: 'loaded' });
                }
            })
            .catch(err => {
                console.error(err);
                if (isMounted) {
                    setLoadState({
                        courseId: id,
                        data: null,
                        error: getApiErrorMessage(err, 'Не удалось открыть курс. Попробуйте вернуться к списку.'),
                        status: 'error',
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [id]);

    const isLoading = loadState.status === 'loading' || loadState.courseId !== id;
    const data = loadState.courseId === id ? loadState.data : null;
    const loadError = loadState.courseId === id ? loadState.error : null;

    if (isLoading) {
        return (
            <div className="flex h-dvh items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const isCourseLocked = data?.course?.is_unlocked === false;
    const progressPercent = Number(data?.progress_percent || 0);

    return (
        <div className="mx-auto min-h-dvh max-w-3xl overflow-x-clip pb-32">
            <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur min-[380px]:px-4">
                <Button variant="ghost" size="icon" aria-label="Вернуться к списку курсов" onClick={() => navigate('/courses')}>
                    <ChevronLeft size={22} />
                </Button>
                <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{data?.course?.title || 'Курс'}</h1>
            </div>

            <div className="px-4 py-6 min-[380px]:py-8">
                {loadError || !data ? (
                    <StudentStateMessage
                        icon={AlertCircle}
                        title="Курс не открылся"
                        description={loadError || 'Курс не найден или больше недоступен.'}
                        actionLabel="К списку курсов"
                        onAction={() => navigate('/courses')}
                    />
                ) : isCourseLocked ? (
                    <div className="space-y-4">
                        <StudentStateMessage
                            icon={Lock}
                            title="Курс заблокирован"
                            description={data.course.lock_reason || 'У вас пока нет доступа к этому курсу.'}
                            actionLabel="К списку курсов"
                            onAction={() => navigate('/courses')}
                        />
                        {data.course.is_vip && data.course.vip_group_link && (
                            <Button
                                className="w-full rounded-xl"
                                onClick={() => window.open(data.course.vip_group_link, '_blank')}
                            >
                                <Gem size={16} />
                                Получить VIP доступ
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <Card className="border-border/70">
                            <CardHeader className="p-5 pb-2">
                                <CardTitle className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                    <span>Общий прогресс</span>
                                    <span className={cn(progressPercent === 100 ? "text-green-500" : "text-primary")}>
                                        {progressPercent}%
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 pt-0">
                                <Progress
                                    value={progressPercent}
                                    className="h-2"
                                    indicatorClassName={cn(progressPercent === 100 && "bg-green-500")}
                                />
                            </CardContent>
                        </Card>

                        {data.modules.length === 0 ? (
                            <StudentStateMessage
                                icon={BookOpen}
                                title="Уроки скоро появятся"
                                description="Курс уже в вашем списке, но программа ещё не опубликована."
                            />
                        ) : (
                            <div className="space-y-7">
                                {data.modules.map((module) => (
                                    <div key={module.id} className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <h3 className="truncate text-base font-semibold text-foreground">{module.title}</h3>
                                                {module.is_locked && <Lock size={14} className="shrink-0 text-amber-600" />}
                                            </div>
                                        </div>

                                        {module.lessons.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                                В этом модуле пока нет опубликованных уроков.
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                {module.lessons.map((lesson) => {
                                                    const isLessonLocked = Boolean(module.is_locked || lesson.is_locked);
                                                    const lockReason = lesson.lock_reason || module.lock_reason;

                                                    return (
                                                        <button
                                                            key={lesson.id}
                                                            type="button"
                                                            disabled={isLessonLocked}
                                                            aria-label={isLessonLocked ? `${lesson.title}. ${lockReason || 'Урок заблокирован'}` : `Открыть урок ${lesson.title}`}
                                                            className={cn(
                                                                "w-full overflow-hidden rounded-xl border border-border/70 bg-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                                isLessonLocked
                                                                    ? "cursor-not-allowed opacity-70"
                                                                    : "hover:bg-muted/30 active:scale-[0.99]"
                                                            )}
                                                            onClick={() => navigate(`/lesson/${lesson.id}`)}
                                                        >
                                                            <span className="flex items-center gap-4 p-4">
                                                                <span className={cn(
                                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                                                    lesson.is_completed ? "bg-green-500/10 text-green-600" :
                                                                        isLessonLocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                                                                )}>
                                                                    {lesson.is_completed ? <CheckCircle size={18} /> :
                                                                        isLessonLocked ? <Lock size={16} /> : <PlayCircle size={20} />}
                                                                </span>
                                                                <span className="min-w-0 flex-1 overflow-hidden">
                                                                    <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                                                                    {isLessonLocked && lockReason && (
                                                                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                                                                            {lockReason}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                {!isLessonLocked && <ChevronRight size={16} className="text-muted-foreground/50" />}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {module.is_locked && module.lock_reason && (
                                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                                        <Lock size={14} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-amber-700">{module.lock_reason}</p>
                                                        {module.lock_reason.includes('VIP') && data.course.vip_group_link && (
                                                            <Button
                                                                onClick={() => window.open(data.course.vip_group_link, '_blank')}
                                                                className="mt-3 w-full rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                                                            >
                                                                <Gem size={16} />
                                                                Стать VIP участником
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
