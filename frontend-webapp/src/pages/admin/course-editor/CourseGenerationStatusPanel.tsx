import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Progress } from '../../../components/ui/progress';
import {
    getCourseStructureGenerationStatusLabel,
    isActiveCourseStructureGenerationStatus,
} from '../course-generation/courseStructureGenerationStatus';
import type { CourseStructureGenerationState } from '../course-generation/courseStructureGenerationTypes';

interface CourseGenerationStatusPanelProps {
    state: CourseStructureGenerationState;
    onCheckStatus: () => void;
    onOpenDetails: () => void;
}

export const CourseGenerationStatusPanel = ({
    state,
    onCheckStatus,
    onOpenDetails,
}: CourseGenerationStatusPanelProps) => {
    if (state.status === 'idle') return null;

    const isActive = state.status === 'starting' || isActiveCourseStructureGenerationStatus(state.status);
    const variant = state.status === 'failed' ? 'error' : state.status === 'completed' ? 'success' : 'info';
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
    if (state.status === 'completed') {
        return `Создано папок: ${state.created_modules_count || 0}, уроков: ${state.created_lessons_count || 0}.`;
    }

    if (state.status === 'failed') {
        return state.error || 'Генерация остановилась. Проверьте источники и запустите еще раз.';
    }

    return state.message || 'Материалы обрабатываются, папки и уроки появятся здесь автоматически.';
};
