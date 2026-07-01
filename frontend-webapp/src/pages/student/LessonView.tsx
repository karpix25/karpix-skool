import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, Lock, CheckCircle, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import type { LessonDetailData } from '../../types/course';

export const LessonView: React.FC = () => {
    const { id } = useParams();
    const { refreshProfile } = useAuth();
    const [data, setData] = useState<LessonDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<LessonDetailData>(`/webapp/lessons/${id}`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await api.post(`/webapp/lessons/${id}/complete`);
            setData((prev) => prev ? { ...prev, is_completed: true } : prev);
            await refreshProfile();
        } catch (err) {
            console.error(err);
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (!data) return <div className="p-20 text-center text-muted-foreground font-bold italic">Урок не найден</div>;

    if (data.is_locked) {
        return (
            <div className="flex flex-col items-center justify-center p-8 min-h-screen text-center space-y-6">
                <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center">
                    <Lock size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Доступ закрыт</h2>
                    <p className="text-muted-foreground text-sm max-w-xs">{data.lock_reason || 'Этот урок пока недоступен.'}</p>
                </div>
                <Button size="lg" className="px-10 rounded-full" onClick={() => navigate('/')}>
                    Вернуться к списку
                </Button>
            </div>
        );
    }

    const lesson = data.lesson;

    return (
        <div className="flex flex-col min-h-screen max-w-4xl mx-auto bg-background">
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${data.course_id}`)}>
                    <ChevronLeft size={24} />
                </Button>
                <h1 className="font-bold text-lg truncate flex-1">{lesson.title}</h1>
            </div>

            <div className="flex-1 space-y-0">
                {lesson.video_id && (
                    <div className="w-full aspect-video bg-black shadow-2xl relative overflow-hidden flex items-center justify-center">
                        {lesson.video_provider === 'youtube_unlisted' ? (
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${lesson.video_id}`}
                                title="Video"
                                frameBorder="0"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="text-white text-sm opacity-50 italic">Плеер {lesson.video_provider} не поддерживается</div>
                        )}
                    </div>
                )}

                <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
                    <h2 className="text-3xl font-bold tracking-tight">{lesson.title}</h2>

                    <article className="prose prose-slate dark:prose-invert max-w-none pb-40 text-foreground leading-relaxed font-sans">
                        <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="text-muted-foreground italic">Контент пуст.</p>' }} />
                    </article>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-50">
                <div className="max-w-3xl mx-auto flex gap-4">
                    <Button
                        size="lg"
                        className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/10"
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
                            className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl"
                            onClick={() => navigate(`/lesson/${data.next_lesson_id}`)}
                        >
                            Следующий урок <ChevronRight size={14} className="ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
