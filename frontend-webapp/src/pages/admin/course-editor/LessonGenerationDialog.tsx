import { type FormEvent, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { Textarea } from '../../../components/ui/textarea';
import { isActiveLessonGenerationStatus, getLessonGenerationStatusLabel } from './lessonGenerationStatus';
import type { LessonGenerationFormState, LessonGenerationState, StartLessonGenerationInput } from './lessonGenerationTypes';

const defaultForm: LessonGenerationFormState = {
    sourceUrl: '',
    lessonCount: 5,
    level: '',
    style: '',
};

interface LessonGenerationDialogProps {
    open: boolean;
    moduleTitle?: string;
    generationState: LessonGenerationState;
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: StartLessonGenerationInput) => void;
    onCheckStatus: () => void;
    onReset: () => void;
}

export const LessonGenerationDialog = ({
    open,
    moduleTitle,
    generationState,
    onOpenChange,
    onSubmit,
    onCheckStatus,
    onReset,
}: LessonGenerationDialogProps) => {
    const [form, setForm] = useState<LessonGenerationFormState>(defaultForm);
    const isBusy = generationState.status === 'starting' || isActiveLessonGenerationStatus(generationState.status);
    const canCheckStatus = Boolean(generationState.id) && isActiveLessonGenerationStatus(generationState.status);
    const statusDescription = generationState.status === 'completed' && typeof generationState.created_lessons_count === 'number'
        ? `Создано уроков: ${generationState.created_lessons_count}. Список обновится автоматически.`
        : generationState.error || generationState.message || 'После завершения список уроков обновится автоматически.';

    useEffect(() => {
        if (open) {
            queueMicrotask(() => setForm(defaultForm));
            onReset();
        }
    }, [open, onReset]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const sourceUrl = form.sourceUrl.trim();
        if (!sourceUrl || isBusy) return;
        const lessonCount = Math.min(12, Math.max(1, Math.trunc(form.lessonCount)));

	        onSubmit({
	            source_url: sourceUrl,
	            lesson_count: lessonCount,
	            level: form.level.trim() || undefined,
            style: form.style.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-md">
                <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
                    <div className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Сгенерировать уроки
	                        </DialogTitle>
	                        <DialogDescription className="text-sm leading-5 text-muted-foreground">
	                            {moduleTitle ? `Модуль: ${moduleTitle}` : 'Укажите ссылку на источник для выбранного модуля.'}
	                        </DialogDescription>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
	                            <Label className="ml-1 text-xs font-medium text-muted-foreground">Ссылка на источник</Label>
	                            <Input
	                                value={form.sourceUrl}
	                                onChange={(event) => setForm(prev => ({ ...prev, sourceUrl: event.target.value }))}
	                                placeholder="https://example.com/material"
                                disabled={isBusy}
                                className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[7rem_1fr]">
                            <div className="space-y-2">
                                <Label className="ml-1 text-xs font-medium text-muted-foreground">Уроков</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={form.lessonCount}
                                    onChange={(event) => setForm(prev => ({
                                        ...prev,
                                        lessonCount: Number(event.target.value) || 1,
                                    }))}
                                    disabled={isBusy}
                                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="ml-1 text-xs font-medium text-muted-foreground">Уровень</Label>
                                <Input
                                    value={form.level}
                                    onChange={(event) => setForm(prev => ({ ...prev, level: event.target.value }))}
                                    placeholder="Например: новичок"
                                    disabled={isBusy}
                                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="ml-1 text-xs font-medium text-muted-foreground">Стиль</Label>
                            <Textarea
                                value={form.style}
                                onChange={(event) => setForm(prev => ({ ...prev, style: event.target.value }))}
                                placeholder="Опционально: тон, глубина, язык объяснения"
                                disabled={isBusy}
                                className="min-h-24 rounded-lg border-border bg-muted/30 text-sm font-medium"
                            />
                        </div>
                    </div>

                    {generationState.status !== 'idle' && (
                        <div className="space-y-3">
                            <InlineAlert
                                variant={generationState.status === 'failed' ? 'error' : generationState.status === 'completed' ? 'success' : 'info'}
                                title={getLessonGenerationStatusLabel(generationState.status)}
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
	                            disabled={!form.sourceUrl.trim() || isBusy}
                            className="h-12 rounded-lg bg-primary text-xs font-medium text-white hover:bg-primary/90"
                        >
                            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isBusy ? 'Генерируем' : 'Запустить генерацию'}
                        </Button>
                        {canCheckStatus && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCheckStatus}
                                className="h-11 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Проверить статус
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-11 rounded-lg text-xs font-medium text-muted-foreground/70 hover:text-foreground"
                        >
                            {generationState.status === 'completed' ? 'Готово' : 'Отмена'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
