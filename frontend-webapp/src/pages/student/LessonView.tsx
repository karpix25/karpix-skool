import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ChevronLeft, Lock, CheckCircle, ChevronRight, FileText } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { getApiErrorMessage } from '../../services/apiError';
import type { LessonDetailData } from '../../types/course';
import { LessonVideoPlayer } from './components/LessonVideoPlayer';
import { StudentStateMessage } from './components/StudentStateMessage';

export const LessonView: React.FC = () => {
    const { id } = useParams();
    const { refreshProfile } = useAuth();
    const [data, setData] = useState<LessonDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [completeError, setCompleteError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);

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
        try {
            await api.post(`/webapp/lessons/${id}/complete`);
            setData((prev) => prev ? { ...prev, is_completed: true } : prev);
            await refreshProfile();
        } catch (err) {
            console.error(err);
            setCompleteError(getApiErrorMessage(err, 'Не удалось завершить урок. Попробуйте еще раз.'));
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (!data) {
        return (
            <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
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
            <div className="flex flex-col items-center justify-center p-8 min-h-screen text-center space-y-6">
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
        <div className="flex flex-col min-h-screen max-w-4xl mx-auto bg-background">
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Вернуться к курсу"
                    onClick={() => navigate(`/course/${data.course_id}`)}
                >
                    <ChevronLeft size={24} />
                </Button>
                <h1 className="font-bold text-lg truncate flex-1">{lesson.title}</h1>
            </div>

            <div className="flex-1 space-y-0">
                <LessonVideoPlayer lesson={lesson} />

                <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
                    <h2 className="text-3xl font-bold tracking-tight">{lesson.title}</h2>

                    {lesson.content ? (
                        <article className="prose prose-slate dark:prose-invert max-w-none pb-60 min-[380px]:pb-44 text-foreground leading-relaxed font-sans">
                            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                        </article>
                    ) : (
                        <StudentStateMessage
                            icon={FileText}
                            title="Материалы урока скоро появятся"
                            description="Когда автор добавит описание, оно появится здесь."
                            className="mb-60 min-[380px]:mb-44"
                        />
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-lg border-t z-50">
                <div className="max-w-3xl mx-auto space-y-3">
                    {completeError && (
                        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{completeError}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:gap-4">
                        <Button
                            size="lg"
                            className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/10 whitespace-nowrap"
                            disabled={data.is_completed || isCompleting}
                            onClick={handleComplete}
                            variant={data.is_completed ? 'secondary' : 'default'}
                        >
                            {isCompleting ? <Loader2 className="animate-spin h-4 w-4" /> :
                                data.is_completed ? (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-500" />
                                        <span>Урок пройден</span>
                                    </div>
                                ) : 'Завершить урок'}
                        </Button>

                        {data.next_lesson_id && (
                            <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl whitespace-nowrap"
                                onClick={() => navigate(`/lesson/${data.next_lesson_id}`)}
                            >
                                Следующий урок <ChevronRight size={14} className="ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
