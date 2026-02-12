import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Rocket, BookOpen, Trophy, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { CourseCard } from './components/CourseCard';

export const Dashboard: React.FC = () => {
    const { user, membership, isAdmin } = useAuth();
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
    const level = membership?.level || 1;
    const nextLevelXp = (level + 1) * 1000;
    const prevLevelXp = level * 1000;
    const xpInCurrentLevel = currentXp - prevLevelXp;
    const xpNeededForNext = nextLevelXp - prevLevelXp;
    const progressPercent = Math.min(Math.max((xpInCurrentLevel / xpNeededForNext) * 100, 0), 100);

    return (
        <>
            {membership && (
                <section>
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-primary">Level {level} Progress</span>
                            <span className="text-xs text-muted-foreground">{currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                        </div>
                        <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-1000 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground text-center italic">
                            Earn {(nextLevelXp - currentXp).toLocaleString()} more XP to unlock next level
                        </p>
                    </div>
                </section>
            )}

            {(!user?.admin_status || user?.admin_status === 'none') && !isAdmin && (
                <Card className="bg-primary text-primary-foreground border-none overflow-hidden shadow-lg shadow-primary/20">
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-white/20 rounded-full">
                            <Rocket size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Launch your own school?</h2>
                            <p className="text-white/80 text-sm">Create your community and start earning today.</p>
                        </div>
                        <Button
                            size="lg"
                            variant="secondary"
                            className="w-full sm:w-auto px-10 font-bold uppercase tracking-widest text-xs"
                            onClick={() => navigate('/apply')}
                        >
                            Start Now
                        </Button>
                    </CardContent>
                </Card>
            )}

            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-base font-bold">Active Courses</h2>
                    <button
                        onClick={() => navigate('/courses')}
                        className="text-xs font-semibold text-primary"
                    >
                        View All
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4 -mx-1 px-1">
                    {courses.length === 0 ? (
                        <div className="w-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border/50">
                            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No active courses yet</p>
                        </div>
                    ) : (
                        courses.map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-base font-bold mb-4 px-1">Weekly Leaderboard</h2>
                <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                    <div className="flex items-center p-3 border-b border-border/50">
                        <span className="w-6 text-center text-yellow-500 font-bold italic">1</span>
                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center mx-3 border border-yellow-500/20">
                            <Trophy size={14} className="text-yellow-600" />
                        </div>
                        <span className="flex-1 text-sm font-medium">Top Student</span>
                        <span className="text-xs font-bold text-muted-foreground">4,120 XP</span>
                    </div>
                    <div className="flex items-center p-3 bg-primary/10 border-b border-primary/20">
                        <span className="w-6 text-center text-primary font-bold italic">{membership?.rank || 12}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-3 border border-primary/20 overflow-hidden">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={user?.avatar_url} />
                                <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="flex-1 text-sm font-bold text-primary">{user?.username || 'You'} (You)</span>
                        <span className="text-xs font-bold text-primary">{currentXp.toLocaleString()} XP</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/leaderboard')}
                    className="w-full text-center mt-4 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1"
                >
                    View Full Leaderboard <ChevronRight size={14} />
                </button>
            </section>
        </>
    );
};
