import React from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '../../../components/ui/dialog';
import type { CourseModule } from '../../../types/course';
import { CourseCurriculumNav } from './CourseCurriculumNav';

interface CourseContentsDialogProps {
    open: boolean;
    modules: CourseModule[];
    activeLessonId: string | null;
    activeModuleId: string | null;
    onOpenChange: (open: boolean) => void;
    onSelectLesson: (lessonId: string) => void;
    onOpenVipAccess?: () => void;
}

export const CourseContentsDialog: React.FC<CourseContentsDialogProps> = ({
    open,
    modules,
    activeLessonId,
    activeModuleId,
    onOpenChange,
    onSelectLesson,
    onOpenVipAccess,
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[84dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-b-none rounded-t-2xl border-border/80 bg-background p-0 shadow-[0_-18px_48px_rgba(15,23,42,0.14)] dark:shadow-none sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
            <div className="border-b border-border/80 px-5 pb-4 pt-5">
                <DialogTitle className="pr-10 text-base font-semibold">Содержание</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    Выберите главу или урок, не выходя из курса.
                </DialogDescription>
            </div>

            <div className="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <CourseCurriculumNav
                    modules={modules}
                    activeLessonId={activeLessonId}
                    activeModuleId={activeModuleId}
                    onSelectLesson={(lessonId) => {
                        onSelectLesson(lessonId);
                        onOpenChange(false);
                    }}
                    onOpenVipAccess={onOpenVipAccess}
                />
            </div>
        </DialogContent>
    </Dialog>
);
