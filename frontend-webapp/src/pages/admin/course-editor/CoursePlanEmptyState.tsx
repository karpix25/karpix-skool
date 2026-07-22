import { FilePlus2, Folder, Loader2, Plus, RefreshCw, WandSparkles } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Progress } from '../../../components/ui/progress';
import {
    getCourseStructureGenerationStatusLabel,
    isActiveCourseStructureGenerationStatus,
} from '../course-generation/courseStructureGenerationStatus';
import type { CourseStructureGenerationState } from '../course-generation/courseStructureGenerationTypes';

interface CoursePlanEmptyStateProps {
    generationState: CourseStructureGenerationState;
    openNotebookUrl?: string | null;
    isAddingLesson?: boolean;
    onAddModule: () => void;
    onAddLesson: () => void;
    onGenerateFromSource: () => void;
    onOpenDetails: () => void;
    onCheckStatus: () => void;
}

export const CoursePlanEmptyState = ({
    generationState,
    openNotebookUrl,
    isAddingLesson = false,
    onAddModule,
    onAddLesson,
    onGenerateFromSource,
    onOpenDetails,
    onCheckStatus,
}: CoursePlanEmptyStateProps) => {
    if (generationState.status !== 'idle') {
        const isActive = generationState.status === 'starting'
            || isActiveCourseStructureGenerationStatus(generationState.status);
        const variant = generationState.status === 'failed'
            ? 'error'
            : generationState.status === 'completed'
                ? 'success'
                : 'info';

        return (
            <div className="space-y-4 rounded-lg border border-dashed border-border bg-card p-5">
                <InlineAlert
                    variant={variant}
                    title={getCourseStructureGenerationStatusLabel(generationState.status)}
                    description={emptyStateStatusDescription(generationState)}
                />
                {typeof generationState.progress === 'number' && (
                    <Progress value={generationState.progress} className="h-2" />
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="secondary" onClick={onOpenDetails} className="h-11 rounded-lg text-xs font-semibold">
                        {isActive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Детали
                    </Button>
                    {isActive ? (
                        <Button type="button" variant="outline" onClick={onCheckStatus} className="h-11 rounded-lg text-xs font-semibold">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Проверить
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" onClick={onGenerateFromSource} className="h-11 rounded-lg text-xs font-semibold">
                            <WandSparkles className="mr-2 h-4 w-4" />
                            Новый запуск
                        </Button>
                    )}
                </div>
                {!isActive && (
                    <Button type="button" variant="secondary" onClick={onAddLesson} disabled={isAddingLesson} className="h-11 w-full rounded-lg text-xs font-semibold">
                        {isAddingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                        {isAddingLesson ? 'Открываем редактор' : 'Добавить урок вручную'}
                    </Button>
                )}
                {openNotebookUrl && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => window.open(openNotebookUrl, '_blank', 'noopener,noreferrer')}
                        className="h-10 w-full rounded-lg text-xs font-semibold text-muted-foreground"
                    >
                        Открыть Open Notebook
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-6 rounded-lg border border-dashed border-border bg-card py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Folder className="h-8 w-8" />
            </div>
            <div className="max-w-[240px] space-y-1">
                <p className="text-sm font-bold">Учебный план пуст</p>
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">Добавьте первый модуль или создайте структуру из материалов.</p>
            </div>
            <Button onClick={onAddModule} variant="secondary" className="h-11 rounded-lg px-6 text-xs font-medium">
                <Plus size={14} className="mr-2" /> Новый модуль
            </Button>
            <Button onClick={onAddLesson} disabled={isAddingLesson} variant="secondary" className="h-11 rounded-lg px-6 text-xs font-medium">
                {isAddingLesson ? <Loader2 size={14} className="mr-2 animate-spin" /> : <FilePlus2 size={14} className="mr-2" />}
                {isAddingLesson ? 'Открываем' : 'Новый урок'}
            </Button>
            <Button onClick={onGenerateFromSource} variant="outline" className="h-11 rounded-lg px-6 text-xs font-medium">
                <WandSparkles size={14} className="mr-2" /> Из источника
            </Button>
        </div>
    );
};

const emptyStateStatusDescription = (state: CourseStructureGenerationState) => {
    if (state.status === 'completed') {
        return `Создано папок: ${state.created_modules_count || 0}, уроков: ${state.created_lessons_count || 0}.`;
    }
    if (state.status === 'failed') {
        return state.error || 'Генерация остановилась. Проверьте источники и запустите еще раз.';
    }
    return state.message || 'Материалы обрабатываются, папки и уроки появятся здесь автоматически.';
};
