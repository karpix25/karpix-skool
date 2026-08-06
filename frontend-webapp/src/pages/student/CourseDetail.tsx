import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, Gem, Loader2, Lock } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { openExternalLink } from '../../lib/externalLinks';
import { cn } from '../../lib/utils';
import { CourseSubscriptionButton } from './components/CourseSubscriptionButton';
import { StudentStateMessage } from './components/StudentStateMessage';
import { applyLessonCompletionToCourseData } from './course-workspace/courseProgressUpdates';
import { CourseActiveLesson } from './course-workspace/CourseActiveLesson';
import { CourseContentsDialog } from './course-workspace/CourseContentsDialog';
import { CourseDesktopSidebar } from './course-workspace/CourseDesktopSidebar';
import { CourseMobileOutline } from './course-workspace/CourseMobileOutline';
import { CourseWorkspaceHeader } from './course-workspace/CourseWorkspaceHeader';
import {
    findActiveModuleId,
    flattenCourseLessons,
    getAdjacentLessonIds,
    resolveActiveLessonId,
} from './course-workspace/courseNavigation';
import { useActiveLessonData } from './course-workspace/useActiveLessonData';
import { useCourseDetailData } from './course-workspace/useCourseDetailData';
import { useStudentFavorites } from './catalog/useStudentFavorites';

const normalizeProgressPercent = (value: number | null | undefined): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(100, Math.max(0, Math.round(parsed)));
};

export const CourseDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { activeTenantId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isContentsOpen, setIsContentsOpen] = useState(false);

    const requestedLessonId = searchParams.get('lessonId');
    const requestedModuleId = searchParams.get('moduleId');
    const courseState = useCourseDetailData(id);
    const data = courseState.data;
    const favoriteState = useStudentFavorites(activeTenantId);

    const flatLessons = useMemo(() => flattenCourseLessons(data), [data]);
    const activeLessonId = useMemo(
        () => resolveActiveLessonId({
            data,
            lessonIdFromQuery: requestedLessonId,
            moduleIdFromQuery: requestedModuleId,
        }),
        [data, requestedLessonId, requestedModuleId],
    );
    const activeModuleId = useMemo(
        () => findActiveModuleId(flatLessons, activeLessonId),
        [flatLessons, activeLessonId],
    );
    const adjacentLessonIds = useMemo(
        () => getAdjacentLessonIds(flatLessons, activeLessonId),
        [flatLessons, activeLessonId],
    );

    const selectLesson = useCallback((lessonId: string) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('lessonId', lessonId);
        nextParams.delete('moduleId');
        setSearchParams(nextParams);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchParams, setSearchParams]);

    const activeLessonState = useActiveLessonData(activeLessonId, {
        onCompleted: (completion) => {
            if (!data || !activeLessonId) return;
            courseState.setData(applyLessonCompletionToCourseData(data, activeLessonId, completion));
        },
    });

    if (courseState.isLoading) {
        return (
            <div className="flex h-dvh items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (courseState.error || !data) {
        return (
            <div className="mx-auto flex min-h-dvh max-w-3xl items-center px-4">
                <StudentStateMessage
                    icon={AlertCircle}
                    title="Курс не открылся"
                    description={courseState.error || 'Курс не найден или больше недоступен.'}
                    actionLabel="К списку курсов"
                    onAction={() => navigate('/courses')}
                    className="w-full"
                />
            </div>
        );
    }

    const isCourseLocked = data.course.is_unlocked === false;
    const progressPercent = normalizeProgressPercent(data.progress_percent);
    const shouldShowMobileOutline = !requestedLessonId;
    const openVipAccess = data.course.vip_group_link
        ? () => openExternalLink(data.course.vip_group_link as string)
        : undefined;

    if (isCourseLocked) {
        return (
            <div className="min-h-dvh overflow-x-clip bg-background">
                <CourseWorkspaceHeader
                    course={data.course}
                    progressPercent={progressPercent}
                    onBack={() => navigate('/courses')}
                    onOpenContents={() => setIsContentsOpen(true)}
                    showContentsButton={false}
                />

                <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
                    <StudentStateMessage
                        icon={Lock}
                        title="Курс заблокирован"
                        description={data.course.lock_reason || 'У вас пока нет доступа к этому курсу.'}
                        actionLabel="К списку курсов"
                        onAction={() => navigate('/courses')}
                    />
                    {data.course.is_vip && openVipAccess && (
                        <Button className="h-12 w-full rounded-lg" onClick={openVipAccess}>
                            <Gem size={16} />
                            Получить VIP доступ
                        </Button>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh overflow-x-clip bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">
            <CourseWorkspaceHeader
                course={data.course}
                progressPercent={progressPercent}
                onBack={() => navigate('/courses')}
                onOpenContents={() => setIsContentsOpen(true)}
                showContentsButton={!shouldShowMobileOutline}
            />

            {shouldShowMobileOutline && (
                <CourseMobileOutline
                    data={data}
                    progressPercent={progressPercent}
                    activeModuleId={requestedModuleId}
                    onSelectLesson={(lessonId) => navigate(`/lesson/${lessonId}`)}
                    onOpenVipAccess={openVipAccess}
                />
            )}

            <main
                className={cn(
                    'mx-auto w-full max-w-7xl gap-5 px-4 py-5 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:px-6',
                    shouldShowMobileOutline ? 'hidden' : 'grid',
                )}
            >
                <CourseDesktopSidebar
                    modules={data.modules}
                    activeLessonId={activeLessonId}
                    activeModuleId={activeModuleId}
                    onSelectLesson={selectLesson}
                    onOpenVipAccess={openVipAccess}
                />

                <div className="min-w-0 space-y-4">
                    <CourseSubscriptionButton courseId={data.course.id} className="h-11 w-full lg:hidden" />

                    <CourseActiveLesson
                        data={activeLessonState.data}
                        favoritePending={favoriteState.pendingIds.has(data.course.id)}
                        isLoading={activeLessonState.isLoading}
                        loadError={activeLessonState.error}
                        isFavorite={favoriteState.isFavorite(data.course.id)}
                        completionResult={activeLessonState.completionResult}
                        completeError={activeLessonState.completeError}
                        isCompleting={activeLessonState.isCompleting}
                        nextLessonId={adjacentLessonIds.nextLessonId}
                        onComplete={activeLessonState.completeLesson}
                        onFavoriteToggle={() => favoriteState.toggleFavorite(data.course.id)}
                        onQuizCompleted={activeLessonState.markCompletedFromQuiz}
                        onSelectNext={() => {
                            if (adjacentLessonIds.nextLessonId) {
                                selectLesson(adjacentLessonIds.nextLessonId);
                            }
                        }}
                    />
                </div>
            </main>

            <CourseContentsDialog
                open={isContentsOpen}
                modules={data.modules}
                activeLessonId={activeLessonId}
                activeModuleId={activeModuleId}
                onOpenChange={setIsContentsOpen}
                onSelectLesson={selectLesson}
                onOpenVipAccess={openVipAccess}
            />
        </div>
    );
};
