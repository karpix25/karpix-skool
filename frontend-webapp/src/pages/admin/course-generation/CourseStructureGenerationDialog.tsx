import { type FormEvent, useEffect, useState } from 'react';
import { FolderTree, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { CourseSourceComposer } from '../course-sources/CourseSourceComposer';
import { hasCourseGenerationSources } from '../course-sources/sourceValidation';
import { CourseGenerationQualityFields } from './CourseGenerationQualityFields';
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

interface CourseStructureGenerationDialogProps {
    open: boolean;
    courseId: string;
    courseTitle?: string;
    generationState: CourseStructureGenerationState;
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: StartCourseStructureGenerationInput) => void;
    onCheckStatus: () => void;
    onReset: () => void;
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
}: CourseStructureGenerationDialogProps) => {
    const [form, setForm] = useState<CourseStructureGenerationFormState>(createDefaultCourseStructureGenerationForm);
    const isBusy = generationState.status === 'starting' || isActiveCourseStructureGenerationStatus(generationState.status);
    const hasSources = hasCourseGenerationSources(form.sources);
    const canCheckStatus = Boolean(generationState.id) && isActiveCourseStructureGenerationStatus(generationState.status);
    const statusDescription = generationState.status === 'completed'
        ? `Создано папок: ${generationState.created_modules_count || 0}, уроков: ${generationState.created_lessons_count || 0}.`
        : generationState.error || generationState.message || 'После завершения список папок и уроков обновится автоматически.';

    useEffect(() => {
        if (open && generationState.status === 'idle') {
            queueMicrotask(() => setForm(createDefaultCourseStructureGenerationForm()));
            onReset();
        }
    }, [open, generationState.status, onReset]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
	    event.preventDefault();
	    if (!hasSources || isBusy) return;
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

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="ml-1 text-xs font-medium text-muted-foreground">Источники</Label>
                            <CourseSourceComposer
                                courseId={courseId}
                                disabled={isBusy}
                                sources={form.sources}
                                onChange={(sources) => setForm(prev => ({ ...prev, sources }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="ml-1 text-xs font-medium text-muted-foreground">Папок</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={form.moduleCount}
                                    onChange={(event) => setForm(prev => ({ ...prev, moduleCount: Number(event.target.value) || 1 }))}
                                    disabled={isBusy}
                                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="ml-1 text-xs font-medium text-muted-foreground">Уроков</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={form.lessonsPerModule}
                                    onChange={(event) => setForm(prev => ({ ...prev, lessonsPerModule: Number(event.target.value) || 1 }))}
                                    disabled={isBusy}
                                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                                />
                            </div>
                        </div>

                        <CourseGenerationQualityFields
                            form={form}
                            disabled={isBusy}
                            onChange={setForm}
                        />
                    </div>

                    {generationState.status !== 'idle' && (
                        <div className="space-y-3">
                            <InlineAlert
                                variant={generationState.status === 'failed' ? 'error' : generationState.status === 'completed' ? 'success' : 'info'}
                                title={getCourseStructureGenerationStatusLabel(generationState.status)}
                                description={statusDescription}
                            />
                            {typeof generationState.progress === 'number' && (
                                <Progress value={generationState.progress} className="h-2" />
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
	                        <Button
	                            type="submit"
	                            disabled={!hasSources || isBusy}
                            className="h-12 rounded-lg bg-primary text-xs font-medium text-white hover:bg-primary/90"
                        >
                            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isBusy ? 'Генерируем' : 'Создать структуру'}
                        </Button>
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
