import React from 'react';
import { BookOpen } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { CourseDetailData } from '../../../types/course';
import { CourseSubscriptionButton } from '../components/CourseSubscriptionButton';
import { StudentStateMessage } from '../components/StudentStateMessage';
import { CourseCurriculumNav } from './CourseCurriculumNav';

interface CourseMobileOutlineProps {
    data: CourseDetailData;
    progressPercent: number;
    activeModuleId: string | null;
    onSelectLesson: (lessonId: string) => void;
    onOpenVipAccess?: () => void;
}

export const CourseMobileOutline: React.FC<CourseMobileOutlineProps> = ({
    data,
    progressPercent,
    activeModuleId,
    onSelectLesson,
    onOpenVipAccess,
}) => {
    const isComplete = progressPercent >= 100;

    return (
        <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 lg:hidden">
            <CourseSubscriptionButton courseId={data.course.id} className="h-11 w-full" />

            <Card className="border-border/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
                <CardHeader className="p-5 pb-2">
                    <CardTitle className="flex items-center justify-between gap-3 text-sm font-semibold text-muted-foreground">
                        <span>Общий прогресс</span>
                        <span className={cn(isComplete ? 'text-success' : 'text-primary')}>
                            {progressPercent}%
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                    <Progress
                        value={progressPercent}
                        className="h-2"
                        indicatorClassName={cn(isComplete && 'bg-success')}
                    />
                </CardContent>
            </Card>

            {data.modules.length === 0 ? (
                <StudentStateMessage
                    icon={BookOpen}
                    title="Уроки скоро появятся"
                    description="Курс уже в вашем списке, но программа ещё не опубликована."
                />
            ) : (
                <CourseCurriculumNav
                    modules={data.modules}
                    activeLessonId={null}
                    activeModuleId={activeModuleId}
                    onSelectLesson={onSelectLesson}
                    onOpenVipAccess={onOpenVipAccess}
                    className="space-y-7"
                />
            )}
        </main>
    );
};
