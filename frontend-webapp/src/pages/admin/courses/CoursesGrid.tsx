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
    <main className="flex-1 space-y-6 px-3 pb-24 min-[520px]:px-5 sm:px-6">
        {loading ? (
            <div className="grid grid-cols-3 gap-2 min-[520px]:grid-cols-2 min-[520px]:gap-4 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-2 min-[520px]:space-y-4 min-[520px]:p-4">
                        <Skeleton className="aspect-square w-full rounded-lg min-[520px]:aspect-video" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4 min-[520px]:h-5" />
                            <Skeleton className="h-3 w-1/2 min-[520px]:h-4" />
                        </div>
                    </div>
                ))}
            </div>
        ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="bg-secondary p-5 rounded-lg mb-4">
                    <BookOpen size={48} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold">Курсы не найдены</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                    {searchQuery ? "Попробуйте изменить запрос" : "Добавьте первый курс в учебный план."}
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-3 gap-2 min-[520px]:grid-cols-2 min-[520px]:gap-4 lg:grid-cols-3">
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
