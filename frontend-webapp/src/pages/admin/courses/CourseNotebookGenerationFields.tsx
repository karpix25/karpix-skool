import { FolderTree } from 'lucide-react';

import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';
import { CourseGenerationQualityFields } from '../course-generation/CourseGenerationQualityFields';
import type { CourseStructureGenerationFormState } from '../course-generation/courseStructureGenerationTypes';

export type CourseCreateMode = 'blank' | 'source';

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
	                ['source', 'Open Notebook'],
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
	                    {id === 'source' && <FolderTree size={14} />}
                    {label}
                </button>
            ))}
        </div>

	        {mode === 'source' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
	                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Ссылка на источник</Label>
	                    <Input
	                        value={form.sourceUrl}
	                        onChange={(event) => onFormChange(prev => ({ ...prev, sourceUrl: event.target.value }))}
	                        placeholder="https://example.com/material"
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

                <CourseGenerationQualityFields form={form} onChange={onFormChange} />
            </div>
        )}
    </div>
);
