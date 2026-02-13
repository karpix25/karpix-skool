import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, Lock, Play } from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

type CourseFilter = 'all' | 'in-progress' | 'free' | 'premium';

export const CoursesView: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/webapp/courses')
            .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredCourses = courses.filter(course => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'in-progress') return (course.progress_percent || 0) > 0 && (course.progress_percent || 0) < 100;
        if (activeFilter === 'free') return !course.is_vip && course.is_unlocked;
        if (activeFilter === 'premium') return course.is_vip;
        return true;
    });

    if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const FilterTab = ({ label, value }: { label: string, value: CourseFilter }) => (
        <button
            onClick={() => setActiveFilter(value)}
            className={cn(
                "px-6 py-2 rounded-xl text-xs font-black transition-all",
                activeFilter === value
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
        >
            {label}
        </button>
    );

    return (
        <section className="space-y-8 pb-10">
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                <FilterTab label="Все" value="all" />
                <FilterTab label="В процессе" value="in-progress" />
                <FilterTab label="Бесплатные" value="free" />
                <FilterTab label="Премиум" value="premium" />
            </div>

            {/* Courses Grid */}
            <div className="grid gap-8">
                {filteredCourses.length === 0 ? (
                    <div className="w-full py-20 text-center bg-muted/10 rounded-[40px] border-2 border-dashed border-border/50">
                        <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                        <p className="text-sm font-bold text-muted-foreground">Курсы не найдены</p>
                    </div>
                ) : (
                    filteredCourses.map(course => (
                        <Card
                            key={course.id}
                            className={cn(
                                "group relative overflow-hidden rounded-[40px] border-border/50 bg-card/30 transition-all duration-500",
                                course.is_unlocked ? "hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10" : "opacity-80 grayscale-[0.5]"
                            )}
                            onClick={() => course.is_unlocked && navigate(`/course/${course.id}`)}
                        >
                            {/* Image Container */}
                            <div className="relative aspect-[16/10] overflow-hidden">
                                {course.cover_url ? (
                                    <img
                                        src={course.cover_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground/20">
                                        <BookOpen size={48} />
                                    </div>
                                )}

                                {/* Badge */}
                                <div className="absolute top-6 right-6">
                                    <div className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20 text-white shadow-lg",
                                        !course.is_unlocked ? "bg-slate-900/80" : course.is_vip ? "bg-primary shadow-primary/20" : "bg-green-600 shadow-green-600/20"
                                    )}>
                                        {course.lock_reason || (course.is_vip ? "ПРЕМИУМ" : "БЕСПЛАТНО")}
                                    </div>
                                </div>

                                {/* Lock Overlay */}
                                {!course.is_unlocked && (
                                    <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                                        <div className="bg-background/80 p-6 rounded-[32px] border border-white/10 shadow-2xl">
                                            <Lock size={32} className="text-muted-foreground" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-xl font-black leading-tight tracking-tight group-hover:text-primary transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed opacity-70">
                                        {course.description}
                                    </p>
                                </div>

                                {course.is_unlocked ? (
                                    <div className="space-y-6">
                                        {/* Progress Section */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ПРОГРЕСС</span>
                                                <span className="text-sm font-black text-primary italic">{course.progress_percent || 0}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-1000"
                                                    style={{ width: `${course.progress_percent || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-[24px] font-black text-sm transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
                                        >
                                            <Play size={16} fill="currentColor" className="mr-2" />
                                            Начать обучение
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground opacity-60 mt-4">
                                        <div className="h-[1px] flex-1 bg-border/50" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">КУРС ЗАБЛОКИРОВАН</span>
                                        <div className="h-[1px] flex-1 bg-border/50" />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </section>
    );
};
