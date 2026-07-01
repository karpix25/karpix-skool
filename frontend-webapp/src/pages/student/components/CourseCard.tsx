import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { StudentCourse } from '../../../types/course';

interface CourseCardProps {
    course: StudentCourse;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const navigate = useNavigate();
    const progressPercent = course.progress_percent || 0;

    return (
        <div
            className="min-w-[240px] max-w-[240px] bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm transition-all hover:shadow-md cursor-pointer group"
            onClick={() => navigate(`/course/${course.id}`)}
        >
            <div className="relative h-32 overflow-hidden">
                {course.cover_url ? (
                    <img
                        src={course.cover_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                        <BookOpen size={32} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                            <circle className="text-white/20" cx="16" cy="16" fill="transparent" r="14" stroke="currentColor" strokeWidth="3"></circle>
                            <circle
                                className={progressPercent === 100 ? "text-green-500" : "text-primary"}
                                cx="16"
                                cy="16"
                                fill="transparent"
                                r="14"
                                stroke="currentColor"
                                strokeDasharray="88"
                                strokeDashoffset={88 - (88 * progressPercent) / 100}
                                strokeWidth="3"
                                strokeLinecap="round"
                            ></circle>
                        </svg>
                        <span className="absolute text-[8px] font-bold text-white">{progressPercent}%</span>
                    </div>
                </div>
            </div>
            <div className="p-3 space-y-1">
                <h3 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-[11px] text-muted-foreground italic truncate">
                    {course.description || "Начните обучение"}
                </p>
                <Button className="w-full mt-2 py-1 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                    {progressPercent > 0 ? 'Continue' : 'Start'}
                </Button>
            </div>
        </div>
    );
};
