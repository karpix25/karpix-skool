import { FolderTree } from 'lucide-react';

import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import type { CourseStructureGenerationFormState } from '../course-generation/courseStructureGenerationTypes';

export type CourseCreateMode = 'blank' | 'notebooklm';

interface CourseNotebookGenerationFieldsProps {
    mode: CourseCreateMode;
    form: CourseStructureGenerationFormState;
    onModeChange: (mode: CourseCreateMode) => void;
    onFormChange: (
        form: CourseStructureGenerationFormState | ((prev: CourseStructureGenerationFormState) => CourseStructureGenerationFormState)
    ) => void;
}

export const CourseNotebookGenerationFields = ({
    mode,
    form,
    onModeChange,
    onFormChange,
}: CourseNotebookGenerationFieldsProps) => (
    <div className="space-y-4">
        <Label className="text-xs font-medium text-muted-foreground">Создание</Label>
        <div className="grid grid-cols-2 rounded-lg border border-border/40 bg-muted/30 p-1 text-muted-foreground">
            {([
                ['blank', 'Пустой'],
                ['notebooklm', 'NotebookLM'],
            ] as const).map(([id, label]) => (
                <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => onModeChange(id)}
                    className={cn(
                        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition-[background-color,color,box-shadow]",
                        mode === id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'hover:text-foreground/80 opacity-60'
                    )}
                >
                    {id === 'notebooklm' && <FolderTree size={14} />}
                    {label}
                </button>
            ))}
        </div>

        {mode === 'notebooklm' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">NotebookLM link</Label>
                    <Input
                        value={form.notebookLmUrl}
                        onChange={(event) => onFormChange(prev => ({ ...prev, notebookLmUrl: event.target.value }))}
                        placeholder="https://notebooklm.google.com/..."
                        className="h-12 rounded-lg border-border bg-muted/20 px-4 text-sm font-medium"
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
                            onChange={(event) => onFormChange(prev => ({ ...prev, moduleCount: Number(event.target.value) || 1 }))}
                            className="h-12 rounded-lg border-border bg-muted/20 px-4 text-sm font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Уроков</Label>
                        <Input
                            type="number"
                            min={1}
                            max={12}
                            value={form.lessonsPerModule}
                            onChange={(event) => onFormChange(prev => ({ ...prev, lessonsPerModule: Number(event.target.value) || 1 }))}
                            className="h-12 rounded-lg border-border bg-muted/20 px-4 text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Уровень</Label>
                    <Input
                        value={form.level}
                        onChange={(event) => onFormChange(prev => ({ ...prev, level: event.target.value }))}
                        placeholder="Например: новичок"
                        className="h-12 rounded-lg border-border bg-muted/20 px-4 text-sm font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Стиль</Label>
                    <Textarea
                        value={form.style}
                        onChange={(event) => onFormChange(prev => ({ ...prev, style: event.target.value }))}
                        placeholder="Опционально: тон, глубина, язык объяснения"
                        className="min-h-24 rounded-lg border-border bg-muted/20 text-sm font-medium"
                    />
                </div>
            </div>
        )}
    </div>
);
