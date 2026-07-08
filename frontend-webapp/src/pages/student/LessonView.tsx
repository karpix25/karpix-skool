import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ChevronLeft, Lock } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { getApiErrorMessage } from '../../services/apiError';
import type { LessonCompletionResponse, LessonDetailData } from '../../types/course';
import { LessonActionBar } from './components/LessonActionBar';
import { LessonContentSurface } from './components/LessonContentSurface';
import { StudentStateMessage } from './components/StudentStateMessage';

export const LessonView: React.FC = () => {
    const { id } = useParams();
    const { refreshProfile } = useAuth();
    const [data, setData] = useState<LessonDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [completeError, setCompleteError] = useState<string | null>(null);
    const [completionResult, setCompletionResult] = useState<LessonCompletionResponse | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);
        setCompleteError(null);
        setCompletionResult(null);

        api.get<LessonDetailData>(`/webapp/lessons/${id}`)
            .then(res => setData(res.data))
            .catch(err => {
                console.error(err);
                setData(null);
                setLoadError(getApiErrorMessage(err, 'Не удалось открыть урок. Попробуйте вернуться к курсу.'));
            })
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleComplete = async () => {
        setIsCompleting(true);
        setCompleteError(null);
        setCompletionResult(null);
        try {
            const response = await api.post<LessonCompletionResponse>(`/webapp/lessons/${id}/complete`);
            setData((prev) => prev ? { ...prev, is_completed: true } : prev);
            setCompletionResult(response.data.xp_granted > 0 ? response.data : null);
            await refreshProfile();
        } catch (err) {
            console.error(err);
            setCompleteError(getApiErrorMessage(err, 'Не удалось завершить урок. Попробуйте еще раз.'));
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-dvh bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (!data) {
        return (
            <div className="mx-auto flex min-h-dvh max-w-3xl items-center px-4">
                <StudentStateMessage
                    icon={AlertCircle}
                    title="Урок не открылся"
                    description={loadError || 'Урок не найден или больше недоступен.'}
                    actionLabel="К списку курсов"
                    onAction={() => navigate('/courses')}
                    className="w-full"
                />
            </div>
        );
    }

    if (data.is_locked) {
        const backTarget = data.course_id ? `/course/${data.course_id}` : '/courses';

        return (
            <div className="flex min-h-dvh flex-col items-center justify-center space-y-6 p-6 text-center">
                <StudentStateMessage
                    icon={Lock}
                    title="Урок заблокирован"
                    description={data.lock_reason || 'Этот урок пока недоступен.'}
                    actionLabel={data.course_id ? 'Вернуться к курсу' : 'К списку курсов'}
                    onAction={() => navigate(backTarget)}
                    className="w-full max-w-md"
                />
            </div>
        );
    }

    const lesson = data.lesson;

    return (
        <div className="mx-auto flex min-h-dvh max-w-4xl flex-col overflow-x-clip bg-background">
            <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur min-[380px]:px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Вернуться к курсу"
                    onClick={() => navigate(`/course/${data.course_id}`)}
                >
                    <ChevronLeft size={24} />
                </Button>
                <h1 className="flex-1 truncate text-base font-semibold">{lesson.title}</h1>
            </div>

            <LessonContentSurface lesson={lesson} />

            <LessonActionBar
                completionResult={completionResult}
                completeError={completeError}
                isCompleted={Boolean(data.is_completed)}
                isCompleting={isCompleting}
                nextLessonId={data.next_lesson_id}
                onComplete={handleComplete}
                onNext={() => navigate(`/lesson/${data.next_lesson_id}`)}
            />
        </div>
    );
};
