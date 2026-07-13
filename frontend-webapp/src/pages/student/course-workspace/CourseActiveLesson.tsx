import React from 'react';
import { AlertCircle, BookOpen, Loader2, Lock } from 'lucide-react';

import type { LessonCompletionResponse, LessonDetailData } from '../../../types/course';
import { LessonActionBar } from '../components/LessonActionBar';
import { LessonContentSurface } from '../components/LessonContentSurface';
import { StudentStateMessage } from '../components/StudentStateMessage';
import { LessonQuiz } from '../quizzes/LessonQuiz';

interface CourseActiveLessonProps {
    data: LessonDetailData | null;
    isLoading: boolean;
    loadError: string | null;
    completionResult: LessonCompletionResponse | null;
    completeError: string | null;
    isCompleting: boolean;
    nextLessonId: string | null;
    onComplete: () => void;
    onQuizCompleted: (completion: LessonCompletionResponse) => void;
    onSelectNext: () => void;
}

export const CourseActiveLesson: React.FC<CourseActiveLessonProps> = ({
    data,
    isLoading,
    loadError,
    completionResult,
    completeError,
    isCompleting,
    nextLessonId,
    onComplete,
    onQuizCompleted,
    onSelectNext,
}) => {
    if (isLoading) {
        return (
            <div className="grid min-h-[55dvh] place-items-center rounded-xl border border-border/70 bg-card">
                <Loader2 className="animate-spin text-primary" size={30} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="grid min-h-[55dvh] place-items-center rounded-xl border border-border/70 bg-card p-5">
                <StudentStateMessage
                    icon={loadError ? AlertCircle : BookOpen}
                    title={loadError ? 'Урок не открылся' : 'Уроки скоро появятся'}
                    description={loadError || 'Курс уже открыт, но в нем пока нет доступных опубликованных уроков.'}
                    className="w-full max-w-md"
                />
            </div>
        );
    }

    if (data.is_locked) {
        return (
            <div className="grid min-h-[55dvh] place-items-center rounded-xl border border-border/70 bg-card p-5">
                <StudentStateMessage
                    icon={Lock}
                    title="Урок заблокирован"
                    description={data.lock_reason || 'Этот урок пока недоступен.'}
                    className="w-full max-w-md"
                />
            </div>
        );
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <LessonContentSurface
                lesson={data.lesson}
                afterContent={(
                    <LessonQuiz
                        lessonId={data.lesson.id}
                        isLessonCompleted={Boolean(data.is_completed)}
                        onLessonCompleted={onQuizCompleted}
                    />
                )}
            />

            <LessonActionBar
                position="static"
                className="hidden border-x-0 border-b-0 lg:block"
                completionResult={completionResult}
                completeError={completeError}
                isCompleted={Boolean(data.is_completed)}
                isCompleting={isCompleting}
                nextLessonId={nextLessonId}
                onComplete={onComplete}
                onNext={onSelectNext}
            />

            <LessonActionBar
                position="fixed"
                className="lg:hidden"
                completionResult={completionResult}
                completeError={completeError}
                isCompleted={Boolean(data.is_completed)}
                isCompleting={isCompleting}
                nextLessonId={nextLessonId}
                onComplete={onComplete}
                onNext={onSelectNext}
            />
        </section>
    );
};
