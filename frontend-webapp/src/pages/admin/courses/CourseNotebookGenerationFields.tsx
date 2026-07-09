import { FolderTree } from 'lucide-react';

import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';
import { CourseGenerationQualityFields } from '../course-generation/CourseGenerationQualityFields';
import type { CourseStructureGenerationFormState } from '../course-generation/courseStructureGenerationTypes';
import { CourseSourceComposer } from '../course-sources/CourseSourceComposer';

export type CourseCreateMode = 'blank' | 'source';

type CourseNotebookGenerationView = 'all' | 'mode' | 'materials' | 'settings';

interface CourseNotebookGenerationFieldsProps {
    form: CourseStructureGenerationFormState;
    mode: CourseCreateMode;
    onFormChange: (
        form: CourseStructureGenerationFormState | ((prev: CourseStructureGenerationFormState) => CourseStructureGenerationFormState)
    ) => void;
    onModeChange: (mode: CourseCreateMode) => void;
    view?: CourseNotebookGenerationView;
}

const CourseCreateModeSelector = ({
    mode,
    onModeChange,
}: Pick<CourseNotebookGenerationFieldsProps, 'mode' | 'onModeChange'>) => (
    <div className="space-y-4">
        <Label className="text-xs font-medium text-muted-foreground">Создание</Label>
        <div className="grid grid-cols-2 rounded-lg border border-border/40 bg-muted/30 p-1 text-muted-foreground">
            {([
                ['blank', 'Пустой'],
                ['source', 'Из материалов'],
            ] as const).map(([id, label]) => (
                <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => onModeChange(id)}
                    className={cn(
                        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition-[background-color,color,box-shadow]',
                        mode === id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'opacity-60 hover:text-foreground/80',
                    )}
                >
                    {id === 'source' && <FolderTree size={14} />}
                    {label}
                </button>
            ))}
        </div>
    </div>
);

const CourseGenerationMaterialsFields = ({
    form,
    onFormChange,
}: Pick<CourseNotebookGenerationFieldsProps, 'form' | 'onFormChange'>) => (
    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
        <Label className="ml-1 text-xs font-medium text-muted-foreground">Материалы</Label>
        <CourseSourceComposer
            sources={form.sources}
            onChange={(sources) => onFormChange(prev => ({ ...prev, sources }))}
        />
    </div>
);

const CourseGenerationSettingsFields = ({
    form,
    onFormChange,
}: Pick<CourseNotebookGenerationFieldsProps, 'form' | 'onFormChange'>) => (
    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
        <CourseGenerationQualityFields form={form} onChange={onFormChange} />
    </div>
);

export const CourseNotebookGenerationFields = ({
    form,
    mode,
    onFormChange,
    onModeChange,
    view = 'all',
}: CourseNotebookGenerationFieldsProps) => {
    if (view === 'mode') {
        return <CourseCreateModeSelector mode={mode} onModeChange={onModeChange} />;
    }

    if (mode !== 'source') return null;

    if (view === 'materials') {
        return <CourseGenerationMaterialsFields form={form} onFormChange={onFormChange} />;
    }

    if (view === 'settings') {
        return <CourseGenerationSettingsFields form={form} onFormChange={onFormChange} />;
    }

    return (
        <div className="space-y-4">
            <CourseCreateModeSelector mode={mode} onModeChange={onModeChange} />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                <CourseGenerationMaterialsFields form={form} onFormChange={onFormChange} />
                <CourseGenerationSettingsFields form={form} onFormChange={onFormChange} />
            </div>
        </div>
    );
};
