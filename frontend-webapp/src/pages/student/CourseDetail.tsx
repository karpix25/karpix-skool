import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, Lock, CheckCircle, PlayCircle, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';
import type { CourseDetailData } from '../../types/course';

export const CourseDetail: React.FC = () => {
    const { id } = useParams();
    const [data, setData] = useState<CourseDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<CourseDetailData>(`/webapp/courses/${id}`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [id]);

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    return (
        <div className="max-w-3xl mx-auto pb-32 min-h-screen">
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </Button>
                <h1 className="font-bold text-lg truncate flex-1">{data?.course?.title || 'Загрузка...'}</h1>
            </div>

            {!data ? (
                <div className="p-20 text-center text-muted-foreground font-bold italic">Курс не найден или произошла ошибка</div>
            ) : (
                <div className="px-4 py-8 space-y-8">
                    <Card className="border-none shadow-sm bg-card overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                                <span>Общий прогресс</span>
                                <span className={cn(Number(data.progress_percent) === 100 ? "text-green-500" : "text-primary")}>
                                    {data.progress_percent}%
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <Progress
                                value={Number(data.progress_percent)}
                                className="h-2"
                                indicatorClassName={cn(Number(data.progress_percent) === 100 && "bg-green-500")}
                            />
                        </CardContent>
                    </Card>

                    <div className="space-y-8">
                        {data.modules.map((module) => (
                            <div key={module.id} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-foreground">{module.title}</h3>
                                        {module.is_locked && <Lock size={14} className="text-orange-500" />}
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    {module.lessons.map((lesson) => (
                                        <Card
                                            key={lesson.id}
                                            className={cn(
                                                "border-none shadow-sm transition-all overflow-hidden",
                                                module.is_locked ? "opacity-60 grayscale cursor-not-allowed" : "hover:shadow-md hover:bg-muted/50 cursor-pointer"
                                            )}
                                            onClick={() => !module.is_locked && navigate(`/lesson/${lesson.id}`)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                    lesson.is_completed ? "bg-green-500 text-white" :
                                                        module.is_locked ? "bg-muted text-muted-foreground/40" : "bg-primary/10 text-primary"
                                                )}>
                                                    {lesson.is_completed ? <CheckCircle size={18} /> :
                                                        module.is_locked ? <Lock size={16} /> : <PlayCircle size={20} />}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="font-bold text-sm truncate">{lesson.title}</h4>
                                                </div>
                                                {!module.is_locked && <ChevronRight size={16} className="text-muted-foreground/30" />}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {module.is_locked && module.lock_reason && (
                                    <div className="space-y-3">
                                        <div className="px-4 py-3 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                <Lock size={14} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-500/80">
                                                {module.lock_reason}
                                            </span>
                                        </div>
                                        {module.lock_reason.includes('VIP') && data.course.vip_group_link && (
                                            <Button
                                                onClick={() => window.open(data.course.vip_group_link, '_blank')}
                                                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white h-12 rounded-2xl font-black text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                                            >
                                                💎 Стать VIP участником
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
