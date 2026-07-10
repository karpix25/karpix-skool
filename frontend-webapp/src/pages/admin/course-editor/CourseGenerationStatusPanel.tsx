import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Progress } from '../../../components/ui/progress';
import {
    getCourseStructureGenerationStatusLabel,
    isActiveCourseStructureGenerationStatus,
} from '../course-generation/courseStructureGenerationStatus';
import { CourseGenerationLessonResults } from '../course-generation/CourseGenerationLessonResults';
import type { CourseStructureGenerationState } from '../course-generation/courseStructureGenerationTypes';

interface CourseGenerationStatusPanelProps {
    state: CourseStructureGenerationState;
    onCheckStatus: () => void;
    onOpenDetails: () => void;
    isResuming?: boolean;
    onResume?: (includeSourceGaps: boolean) => void;
}

export const CourseGenerationStatusPanel = ({
    state,
    onCheckStatus,
    onOpenDetails,
    isResuming,
    onResume,
}: CourseGenerationStatusPanelProps) => {
    if (state.status === 'idle') return null;

    const isActive = state.status === 'starting' || isActiveCourseStructureGenerationStatus(state.status);
    const variant = state.status === 'failed' || state.error ? 'error' : state.status === 'completed' ? 'success' : 'info';
    const description = statusDescription(state);

    return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <InlineAlert
                variant={variant}
                title={getCourseStructureGenerationStatusLabel(state.status)}
                description={description}
            />
            {typeof state.progress === 'number' && (
                <Progress value={state.progress} className="mt-3 h-2" />
            )}
            <div className="mt-3">
                <CourseGenerationLessonResults
                    state={state}
                    isResuming={isResuming}
                    onResume={onResume}
                />
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onOpenDetails}
                    className="h-10 flex-1 rounded-lg text-xs font-semibold"
                >
                    {isActive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Детали генерации
                </Button>
                {state.id && isActive && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCheckStatus}
                        className="h-10 flex-1 rounded-lg text-xs font-semibold"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Проверить
                    </Button>
                )}
            </div>
        </div>
    );
};

const statusDescription = (state: CourseStructureGenerationState) => {
    if (state.error) return state.error;

    if (state.status === 'completed') {
        return `Создано папок: ${state.created_modules_count || 0}, уроков: ${state.created_lessons_count || 0}.`;
    }

    if (state.status === 'partial_drafts' || state.status === 'needs_attention') {
        const ready = state.ready_lesson_count ?? state.created_lessons_count ?? 0;
        const planned = state.planned_lesson_count || ready;
        return `${ready} из ${planned} уроков готовы. Остальные можно продолжить отдельно.`;
    }

    if (state.status === 'failed') {
        return 'Генерация остановилась. Проверьте источники и запустите еще раз.';
    }

    return state.message || 'Материалы обрабатываются, папки и уроки появятся здесь автоматически.';
};
