import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';

export const CoursesView: React.FC = () => {
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

    return (
        <section className="space-y-6">
            <div className="flex items-center px-1">
                <h2 className="text-xl font-bold">Все курсы</h2>
            </div>

            <div className="grid gap-6">
                {courses.length === 0 ? (
                    <div className="w-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border/50">
                        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Курсы не найдены</p>
                    </div>
                ) : (
                    courses.map(course => (
                        <Card
                            key={course.id}
                            className="group overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card flex flex-col sm:flex-row h-auto sm:h-32"
                            onClick={() => navigate(`/course/${course.id}`)}
                        >
                            <div className="w-full sm:w-48 bg-muted overflow-hidden relative aspect-video sm:aspect-auto">
                                {course.cover_url ? (
                                    <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><BookOpen size={24} /></div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
                                    {course.progress_percent || 0}%
                                </div>
                            </div>
                            <CardContent className="p-4 flex flex-col justify-center flex-1 min-w-0">
                                <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{course.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{course.description}</p>
                                <div className="mt-3 w-full bg-muted h-1 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full" style={{ width: `${course.progress_percent || 0}%` }}></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </section>
    );
};
