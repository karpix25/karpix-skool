import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { CourseCard } from './components/CourseCard';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { GuidedTour, type TourStep } from '../../components/onboarding/GuidedTour';
import { StudentStateMessage } from './components/StudentStateMessage';
import { WeeklyLeaderboardPreview } from './components/WeeklyLeaderboardPreview';
import { getCourseProgress, isCourseLocked } from './components/courseStatus';
import type { StudentCourse } from '../../types/course';
import type { LeaderboardData } from '../../types/leaderboard';

const studentTourSteps: TourStep[] = [
    {
        selector: 'body',
        title: 'Приветствуем!',
        content: 'Рады видеть вас в школе. На главной теперь главное: продолжить обучение и быстро увидеть прогресс.',
        position: 'center'
    },
    {
        selector: '[data-tour="student-courses"]',
        title: 'Ваше обучение',
        content: 'Здесь находится следующий курс и короткий список доступных курсов.'
    },
    {
        selector: '[data-tour="student-ranking"]',
        title: 'Рейтинг и XP',
        content: 'За уроки вы получаете XP и видите своё место за неделю.'
    },
    {
        selector: '[data-tour="student-nav"]',
        title: 'Навигация',
        content: 'Внизу четыре основных раздела: главная, курсы, рейтинг и профиль.'
    }
];

const selectContinueCourse = (courses: StudentCourse[]): StudentCourse | undefined => {
    const unlockedCourses = courses.filter((course) => !isCourseLocked(course));
    return (
        unlockedCourses.find((course) => {
            const progress = getCourseProgress(course);
            return progress > 0 && progress < 100;
        }) ||
        unlockedCourses.find((course) => getCourseProgress(course) < 100) ||
        unlockedCourses[0] ||
        courses[0]
    );
};

export const Dashboard: React.FC = () => {
    const { user, membership, activeTenantId } = useAuth();
    const [courses, setCourses] = useState<StudentCourse[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showTour, setShowTour] = useState(!membership?.is_onboarded && !!membership);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const fetchDashboardData = async () => {
            setIsLoading(true);
            setLoadError(null);
            const params = activeTenantId ? { tenant_id: activeTenantId } : {};

            const [coursesResult, leaderboardResult] = await Promise.allSettled([
                api.get<StudentCourse[]>('/webapp/courses', { params }),
                api.get<LeaderboardData>('/webapp/leaderboard', { params: { period: 'week', tenant_id: activeTenantId } })
            ]);

            if (!isMounted) return;

            if (coursesResult.status === 'fulfilled') {
                setCourses(Array.isArray(coursesResult.value.data) ? coursesResult.value.data : []);
            } else {
                console.error('Error fetching dashboard courses:', coursesResult.reason);
                setCourses([]);
                setLoadError('Не удалось загрузить курсы. Попробуйте обновить экран.');
            }

            if (leaderboardResult.status === 'fulfilled') {
                setLeaderboard(leaderboardResult.value.data);
            } else {
                console.error('Error fetching dashboard leaderboard:', leaderboardResult.reason);
                setLeaderboard(null);
            }

            setIsLoading(false);
        };

        fetchDashboardData();
        return () => {
            isMounted = false;
        };
    }, [activeTenantId]);

    const continueCourse = useMemo(() => selectContinueCourse(courses), [courses]);
    const previewCourses = useMemo(() => courses.slice(0, 4), [courses]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {showTour && (
                <GuidedTour
                    steps={studentTourSteps}
                    isOpen={showTour}
                    onComplete={() => setShowTour(false)}
                />
            )}

            <section data-tour="student-courses" className="space-y-4">
                <div className="px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Главная</p>
                    <h2 className="text-xl font-bold tracking-tight">Продолжить обучение</h2>
                </div>
                <ContinueLearningCard course={continueCourse} onBrowseCourses={() => navigate('/courses')} />
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Курсы</p>
                        <h2 className="text-lg font-bold tracking-tight">Ваш список</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-xl px-3" onClick={() => navigate('/courses')}>
                        Все
                    </Button>
                </div>

                {loadError ? (
                    <StudentStateMessage
                        icon={AlertCircle}
                        title="Не получилось загрузить курсы"
                        description={loadError}
                        actionLabel="Открыть курсы"
                        onAction={() => navigate('/courses')}
                    />
                ) : previewCourses.length === 0 ? (
                    <StudentStateMessage
                        icon={BookOpen}
                        title="Курсов пока нет"
                        description="Когда школа откроет доступ, они появятся в этом разделе."
                        actionLabel="Смотреть раздел курсов"
                        onAction={() => navigate('/courses')}
                    />
                ) : (
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
                        {previewCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                )}
            </section>

            <WeeklyLeaderboardPreview
                leaderboard={leaderboard}
                membership={membership}
                user={user}
                onOpenLeaderboard={() => navigate('/leaderboard')}
            />
        </div>
    );
};
