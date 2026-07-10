import { type FormEvent, useEffect, useState } from 'react';
import { FolderTree, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { CourseSourceComposer } from '../course-sources/CourseSourceComposer';
import { hasCourseGenerationSources } from '../course-sources/sourceValidation';
import { CourseGenerationQualityFields } from './CourseGenerationQualityFields';
import { CourseGenerationLessonResults } from './CourseGenerationLessonResults';
import { createDefaultCourseStructureGenerationForm, toCourseStructureGenerationInput } from './courseStructureGenerationForm';
import {
    getCourseStructureGenerationStatusLabel,
    isActiveCourseStructureGenerationStatus,
} from './courseStructureGenerationStatus';
import type {
    CourseStructureGenerationFormState,
    CourseStructureGenerationState,
    StartCourseStructureGenerationInput,
} from './courseStructureGenerationTypes';

const generationSteps = ['Источники', 'Качество'];

interface CourseStructureGenerationDialogProps {
    open: boolean;
    courseId: string;
    courseTitle?: string;
    generationState: CourseStructureGenerationState;
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: StartCourseStructureGenerationInput) => void;
    onCheckStatus: () => void;
    onReset: () => void;
    isResuming?: boolean;
    onResume?: (includeSourceGaps: boolean) => void;
}

export const CourseStructureGenerationDialog = ({
    open,
    courseId,
    courseTitle,
    generationState,
    onOpenChange,
    onSubmit,
    onCheckStatus,
    onReset,
    isResuming,
    onResume,
}: CourseStructureGenerationDialogProps) => {
    const [form, setForm] = useState<CourseStructureGenerationFormState>(createDefaultCourseStructureGenerationForm);
    const [stepIndex, setStepIndex] = useState(0);
    const isBusy = generationState.status === 'starting' || isActiveCourseStructureGenerationStatus(generationState.status);
    const hasSources = hasCourseGenerationSources(form.sources);
    const isLastStep = stepIndex === generationSteps.length - 1;
    const canProceed = stepIndex === 0 ? hasSources : true;
    const canCheckStatus = Boolean(generationState.id) && isActiveCourseStructureGenerationStatus(generationState.status);
    const statusDescription = getStatusDescription(generationState);

    useEffect(() => {
        if (open && generationState.status === 'idle') {
            queueMicrotask(() => {
                setForm(createDefaultCourseStructureGenerationForm());
                setStepIndex(0);
            });
            onReset();
        }
    }, [open, generationState.status, onReset]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hasSources || isBusy) return;
        if (!isLastStep) {
            setStepIndex(prev => Math.min(generationSteps.length - 1, prev + 1));
            return;
        }
        onSubmit(toCourseStructureGenerationInput(form));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-md">
                <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
                    <div className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <FolderTree className="h-5 w-5 text-primary" />
                            Создать папки и уроки
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-5 text-muted-foreground">
                            {courseTitle ? `Курс: ${courseTitle}` : 'Материалы станут основой для структуры курса.'}
                        </DialogDescription>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-1">
                        {generationSteps.map((step, index) => (
                            <button
                                key={step}
                                type="button"
                                disabled={disabledStep(index, stepIndex, hasSources, isBusy)}
                                onClick={() => setStepIndex(index)}
                                className={[
                                    'h-10 rounded-md text-xs font-semibold transition',
                                    stepIndex === index
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-background/60',
                                ].join(' ')}
                            >
                                {step}
                            </button>
                        ))}
                    </div>

                    {stepIndex === 0 && (
                        <div className="space-y-2">
                            <Label className="ml-1 text-xs font-medium text-muted-foreground">Источники</Label>
                            <CourseSourceComposer
                                courseId={courseId}
                                disabled={isBusy}
                                sources={form.sources}
                                onChange={(sources) => setForm(prev => ({ ...prev, sources }))}
                            />
                        </div>
                    )}

                    {stepIndex === 1 && (
                        <CourseGenerationQualityFields
                            form={form}
                            disabled={isBusy}
                            onChange={setForm}
                        />
                    )}

                    {generationState.status !== 'idle' && (
                        <div className="space-y-3">
                            <InlineAlert
                                variant={generationState.status === 'failed' || generationState.error ? 'error' : generationState.status === 'completed' ? 'success' : 'info'}
                                title={getCourseStructureGenerationStatusLabel(generationState.status)}
                                description={statusDescription}
                            />
                            {typeof generationState.progress === 'number' && (
                                <Progress value={generationState.progress} className="h-2" />
                            )}
                            <CourseGenerationLessonResults
                                state={generationState}
                                isResuming={isResuming}
                                onResume={onResume}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={!canProceed || isBusy}
                            className="h-12 rounded-lg bg-primary text-xs font-medium text-white hover:bg-primary/90"
                        >
                            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isBusy ? 'Генерируем' : isLastStep ? 'Создать структуру' : 'Далее'}
                        </Button>
                        {stepIndex > 0 && !isBusy && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStepIndex(prev => Math.max(0, prev - 1))}
                                className="h-11 rounded-lg text-xs font-medium"
                            >
                                Назад
                            </Button>
                        )}
                        {canCheckStatus && (
                            <Button type="button" variant="ghost" onClick={onCheckStatus} className="h-11 rounded-lg text-xs font-medium">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Проверить статус
                            </Button>
                        )}
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-lg text-xs font-medium text-muted-foreground">
                            {generationState.status === 'completed' ? 'Готово' : 'Отмена'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const disabledStep = (
    targetIndex: number,
    currentIndex: number,
    hasSources: boolean,
    isBusy: boolean,
) => isBusy || (targetIndex > currentIndex && targetIndex > 0 && !hasSources);

const getStatusDescription = (state: CourseStructureGenerationState) => {
    if (state.error) return state.error;

    if (state.status === 'completed') {
        return `Создано папок: ${state.created_modules_count || 0}, уроков: ${state.created_lessons_count || 0}.`;
    }
    if (state.status === 'partial_drafts' || state.status === 'needs_attention') {
        const ready = state.ready_lesson_count ?? state.created_lessons_count ?? 0;
        const planned = state.planned_lesson_count || ready;
        return `${ready} из ${planned} уроков готовы. Проверьте результат и продолжите только проблемные уроки.`;
    }
    return state.message || 'После завершения список папок и уроков обновится автоматически.';
};
