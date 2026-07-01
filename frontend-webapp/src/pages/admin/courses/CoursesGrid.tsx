import { BookOpen } from 'lucide-react';

import { AdminCourseCard } from '../../../admin/components/courses/AdminCourseCard';
import { Skeleton } from '../../../components/ui/skeleton';
import type { AdminCourse } from '../../../types/admin';

interface CoursesGridProps {
    loading: boolean;
    courses: AdminCourse[];
    searchQuery: string;
    onToggleStatus: (id: string, published: boolean) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onEdit: (course: AdminCourse) => void;
    onAnnounce: (course: AdminCourse) => void;
    onClick: (id: string) => void;
}

export const CoursesGrid = ({
    loading,
    courses,
    searchQuery,
    onToggleStatus,
    onDelete,
    onDuplicate,
    onEdit,
    onAnnounce,
    onClick,
}: CoursesGridProps) => (
    <main className="flex-1 px-6 pb-24 space-y-6">
        {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-card rounded-2xl p-4 border border-border space-y-4">
                        <Skeleton className="aspect-video w-full rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="bg-secondary p-6 rounded-full mb-4">
                    <BookOpen size={48} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold">Курсы не найдены</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                    {searchQuery ? "Попробуйте изменить запрос" : "Добавьте первый курс в учебный план."}
                </p>
            </div>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map(course => (
                    <AdminCourseCard
                        key={course.id}
                        course={course}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onEdit={onEdit}
                        onAnnounce={onAnnounce}
                        onClick={onClick}
                    />
                ))}
            </div>
        )}
    </main>
);
