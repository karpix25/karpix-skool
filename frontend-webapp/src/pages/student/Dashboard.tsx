import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, Trophy, ChevronRight, Sparkles, Wand2, Monitor, ExternalLink } from 'lucide-react';
import api from '../../api/client';
import WebApp from '@twa-dev/sdk';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { CourseCard } from './components/CourseCard';
import { GuidedTour, type TourStep } from '../../components/onboarding/GuidedTour';
import type { StudentCourse } from '../../types/course';
import type { LeaderboardData } from '../../types/leaderboard';

export const Dashboard: React.FC = () => {
    const { user, membership } = useAuth();
    const [courses, setCourses] = useState<StudentCourse[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { activeTenantId } = useAuth();

    const [showTour, setShowTour] = useState(!membership?.is_onboarded && !!membership);

    const studentTourSteps: TourStep[] = [
        {
            selector: 'body',
            title: 'Приветствуем!',
            content: 'Рады видеть вас в нашей школе. Давайте кратко покажу, что здесь есть.',
            position: 'center'
        },
        {
            selector: '[data-tour="student-courses"]',
            title: 'Ваше обучение',
            content: 'Здесь находятся все курсы, к которым у вас есть доступ. Начинайте учиться в любое время!'
        },
        {
            selector: '[data-tour="student-ranking"]',
            title: 'Рейтинг и XP',
            content: 'За прохождение уроков вы получаете XP. Соревнуйтесь с другими студентами и открывайте новые уровни!'
        },
        {
            selector: '[data-tour="student-nav"]',
            title: 'Навигация',
            content: 'Удобное переключение между главной, всеми курсами и таблицей лидеров.'
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        const fetchDashboardData = async () => {
            try {
                const [coursesRes, leaderboardRes] = await Promise.all([
                    api.get<StudentCourse[]>('/webapp/courses'),
                    api.get<LeaderboardData>('/webapp/leaderboard', { params: { period: 'week', tenant_id: activeTenantId } })
                ]);
                setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
                setLeaderboard(leaderboardRes.data);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [activeTenantId]);

    if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const currentXp = membership?.xp || 0;
    const topStudent = leaderboard?.top_three?.find((member) => member.rank === 1);

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {showTour && (
                <GuidedTour
                    steps={studentTourSteps}
                    isOpen={showTour}
                    onComplete={() => setShowTour(false)}
                />
            )}

            {/* Browser Access Banner */}
            <section className="px-1">
                <button
                    onClick={async () => {
                        try {
                            const res = await api.post('/auth/request-desktop-login');
                            const { login_url } = res.data;
                            if (WebApp.platform !== 'unknown') {
                                WebApp.openLink(login_url);
                            } else {
                                window.open(login_url, '_blank');
                            }
                        } catch {
                            alert('Не удалось открыть браузер. Ссылка отправлена в ваш Telegram.');
                        }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-[24px] bg-muted/40 border border-border/50 hover:bg-muted/60 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Monitor size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold tracking-tight">Открыть в браузере</h3>
                            <p className="text-[10px] text-muted-foreground font-medium">Учитесь с комфортом на большом экране</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background border border-border/50 group-hover:border-primary/30 group-hover:text-primary transition-all">
                        <ExternalLink size={16} />
                    </div>
                </button>
            </section>

            <section data-tour="student-courses">
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

            <section data-tour="student-ranking">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="text-lg font-black tracking-tight uppercase">Недельный рейтинг</h2>
                </div>
                <div className="bg-card rounded-[32px] border border-border/50 shadow-sm overflow-hidden text-foreground">
                    {/* Top Student (Real Data) */}
                    {topStudent ? (
                        <div className="flex items-center p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <span className="w-8 text-center text-yellow-500 font-black italic text-lg">1</span>
                            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-4 border border-yellow-500/20 shadow-sm shadow-yellow-500/5 overflow-hidden">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={topStudent.avatar_url} />
                                    <AvatarFallback className="bg-yellow-500/10 text-yellow-600 font-bold">
                                        {topStudent.username?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="flex-1 text-[15px] font-bold tracking-tight">
                                {topStudent.username}
                            </span>
                            <span className="text-xs font-black text-muted-foreground opacity-60">
                                {topStudent.xp.toLocaleString()} XP
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center p-4 border-b border-border/50 last:border-0 opacity-40">
                            <span className="w-8 text-center text-muted-foreground font-black italic text-lg">1</span>
                            <div className="w-10 h-10 rounded-2xl bg-muted/20 flex items-center justify-center mx-4 border border-border/20">
                                <Trophy size={18} className="text-muted-foreground" />
                            </div>
                            <span className="flex-1 text-[15px] font-bold tracking-tight italic">Место вакантно</span>
                        </div>
                    )}

                    {/* Current User Row */}
                    <div className="flex items-center p-5 bg-primary/5 last:border-0">
                        <span className="w-8 text-center text-primary font-black italic text-lg">{leaderboard?.user_rank?.rank || membership?.rank || '?'}</span>
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

            {/* Promo: Become an Author */}
            <section className="pb-10">
                <div
                    onClick={() => navigate('/apply')}
                    className="group relative overflow-hidden rounded-[32px] p-8 cursor-pointer transition-all active:scale-[0.98]"
                >
                    {/* Premium Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5E9] via-[#2563EB] to-[#4F46E5] opacity-90 group-hover:opacity-100 transition-opacity" />

                    {/* Animated background patterns */}
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-black/10 rounded-full blur-3xl" />

                    <div className="relative flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md mb-2">
                                <Sparkles size={12} className="text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Возможность</span>
                            </div>
                            <h3 className="text-2xl font-black text-white leading-tight tracking-tighter">СТАНЬ АВТОРОМ<br />ШКОЛЫ</h3>
                            <p className="text-white/80 text-[11px] font-bold max-w-[180px] leading-relaxed">
                                Делись знаниями, создавай курсы и зарабатывай вместе с нами!
                            </p>
                        </div>

                        <div className="relative">
                            <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <Wand2 size={28} className="text-white drop-shadow-lg" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-bounce" />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-all">
                        Узнать подробнее <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </section>
        </div>
    );
};
