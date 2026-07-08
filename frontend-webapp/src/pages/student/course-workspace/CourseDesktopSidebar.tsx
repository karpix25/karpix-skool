import type { CourseModule } from '../../../types/course';
import { CourseDesktopModuleGroup } from './CourseDesktopModuleGroup';

interface CourseDesktopSidebarProps {
    activeLessonId: string | null;
    activeModuleId: string | null;
    modules: CourseModule[];
    onOpenVipAccess?: () => void;
    onSelectLesson: (lessonId: string) => void;
}

export const CourseDesktopSidebar = ({
    activeLessonId,
    activeModuleId,
    modules,
    onOpenVipAccess,
    onSelectLesson,
}: CourseDesktopSidebarProps) => (
    <aside className="hidden min-w-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-border/80 p-4">
                <p className="text-sm font-semibold text-foreground">Содержание курса</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Главы, уроки и доступ в одном списке.
                </p>
            </div>

            <nav className="space-y-3 p-3" aria-label="Содержание курса">
                {modules.map((module) => (
                    <CourseDesktopModuleGroup
                        key={module.id}
                        module={module}
                        activeLessonId={activeLessonId}
                        activeModuleId={activeModuleId}
                        onSelectLesson={onSelectLesson}
                        onOpenVipAccess={onOpenVipAccess}
                    />
                ))}
            </nav>
        </div>
    </aside>
);
