import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, Trophy, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { CourseCard } from './components/CourseCard';

export const Dashboard: React.FC = () => {
    const { user, membership } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/webapp/courses')
            .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const currentXp = membership?.xp || 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <section>
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="text-lg font-black tracking-tight uppercase">Ваши курсы</h2>
                    <button
                        onClick={() => navigate('/courses')}
                        className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all"
                    >
                        Все
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-6 -mx-1 px-1">
                    {courses.length === 0 ? (
                        <div className="w-full py-16 text-center bg-muted/10 rounded-[32px] border-2 border-dashed border-border/50 opacity-40">
                            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-bold tracking-tight">Пока нет активных курсов</p>
                        </div>
                    ) : (
                        courses.map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))
                    )}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="text-lg font-black tracking-tight uppercase">Недельный рейтинг</h2>
                </div>
                <div className="bg-card rounded-[32px] border border-border/50 shadow-sm overflow-hidden text-foreground">
                    <div className="flex items-center p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <span className="w-8 text-center text-yellow-500 font-black italic text-lg">1</span>
                        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-4 border border-yellow-500/20 shadow-sm shadow-yellow-500/5">
                            <Trophy size={18} className="text-yellow-600" />
                        </div>
                        <span className="flex-1 text-[15px] font-bold tracking-tight">Лучший ученик</span>
                        <span className="text-xs font-black text-muted-foreground opacity-60">4 120 XP</span>
                    </div>
                    <div className="flex items-center p-5 bg-primary/5 last:border-0">
                        <span className="w-8 text-center text-primary font-black italic text-lg">{membership?.rank || 12}</span>
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-4 border border-primary/20 overflow-hidden shadow-sm shadow-primary/5">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={user?.avatar_url} />
                                <AvatarFallback className="bg-primary/5 text-primary font-bold">{user?.username?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="flex-1 text-[15px] font-black text-primary tracking-tight">{user?.username || 'Вы'} (Вы)</span>
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{currentXp.toLocaleString()} XP</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/leaderboard')}
                    className="w-full h-12 rounded-2xl mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-2 border border-border/50"
                >
                    Полный рейтинг <ChevronRight size={16} />
                </button>
            </section>
        </div>
    );
};
