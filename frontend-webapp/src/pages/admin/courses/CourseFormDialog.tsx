import { type ChangeEvent, type RefObject, useState } from 'react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';
import type { CourseFormState } from '../../../types/admin';
import type { CourseStructureGenerationFormState } from '../course-generation/courseStructureGenerationTypes';
import { hasCourseGenerationSources } from '../course-sources/sourceValidation';
import { CourseFormAccessSettings } from './CourseFormAccessSettings';
import { CourseFormBasicFields } from './CourseFormBasicFields';
import { CourseFormStepIndicator } from './CourseFormStepIndicator';
import { CourseNotebookGenerationFields, type CourseCreateMode } from './CourseNotebookGenerationFields';
import {
    getCourseFormPrimaryLabel,
    getCourseFormWizardSteps,
    type CourseFormWizardStep,
} from './courseFormWizard';

interface CourseFormDialogProps {
    open: boolean;
    editingCourseId: string | null;
    course: CourseFormState;
    fileInputRef: RefObject<HTMLInputElement | null>;
    isUploading: boolean;
    isSubmitting: boolean;
    canSubmit: boolean;
    createMode: CourseCreateMode;
    generationForm: CourseStructureGenerationFormState;
    onClose: () => void;
    onSubmit: () => void;
    onCourseChange: (course: CourseFormState | ((prev: CourseFormState) => CourseFormState)) => void;
    onCreateModeChange: (mode: CourseCreateMode) => void;
    onGenerationFormChange: (
        form: CourseStructureGenerationFormState | ((prev: CourseStructureGenerationFormState) => CourseStructureGenerationFormState)
    ) => void;
    onThumbnailUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const isWizardStepReady = (
    step: CourseFormWizardStep,
    course: CourseFormState,
    generationForm: CourseStructureGenerationFormState,
) => {
    if (step === 'course') return Boolean(course.title.trim());
    if (step === 'materials') return hasCourseGenerationSources(generationForm.sources);
    return true;
};

export const CourseFormDialog = ({
    open,
    onClose,
    ...contentProps
}: CourseFormDialogProps) => (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        {open && <CourseFormDialogPanel {...contentProps} onClose={onClose} />}
    </Dialog>
);

type CourseFormDialogPanelProps = Omit<CourseFormDialogProps, 'open'>;

const CourseFormDialogPanel = ({
    editingCourseId,
    course,
    fileInputRef,
    isUploading,
    isSubmitting,
    canSubmit,
    createMode,
    generationForm,
    onClose,
    onSubmit,
    onCourseChange,
    onCreateModeChange,
    onGenerationFormChange,
    onThumbnailUpload,
}: CourseFormDialogPanelProps) => {
    const isEditing = Boolean(editingCourseId);
    const [selectedStep, setSelectedStep] = useState<CourseFormWizardStep>('course');
    const wizardSteps = getCourseFormWizardSteps(createMode);
    const currentStep = wizardSteps.includes(selectedStep)
        ? selectedStep
        : wizardSteps[wizardSteps.length - 1];
    const stepIndex = wizardSteps.indexOf(currentStep);
    const isLastStep = stepIndex === wizardSteps.length - 1;
    const stepReady = isWizardStepReady(currentStep, course, generationForm);
    const actionBlockedByStep = isEditing ? !canSubmit : isLastStep ? !canSubmit : !stepReady;
    const primaryDisabled = isUploading || isSubmitting || actionBlockedByStep;
    const primaryLabel = getCourseFormPrimaryLabel(isEditing, isLastStep, isSubmitting);

    const handlePrimaryAction = () => {
        if (primaryDisabled) return;
        if (isEditing || isLastStep) {
            onSubmit();
            return;
        }
        setSelectedStep(wizardSteps[Math.min(stepIndex + 1, wizardSteps.length - 1)]);
    };

    const handleStepSelect = (step: CourseFormWizardStep) => {
        const nextIndex = wizardSteps.indexOf(step);
        if (nextIndex >= 0 && nextIndex <= stepIndex) {
            setSelectedStep(step);
        }
    };

    const handleCreateModeChange = (mode: CourseCreateMode) => {
        onCreateModeChange(mode);
        setSelectedStep('course');
    };

    const renderCreateStep = () => {
        if (currentStep === 'course') {
            return (
                <div className="space-y-8">
                    <CourseNotebookGenerationFields
                        mode={createMode}
                        form={generationForm}
                        onModeChange={handleCreateModeChange}
                        onFormChange={onGenerationFormChange}
                        view="mode"
                    />
                    <CourseFormBasicFields
                        course={course}
                        fileInputRef={fileInputRef}
                        isUploading={isUploading}
                        onCourseChange={onCourseChange}
                        onThumbnailUpload={onThumbnailUpload}
                    />
                </div>
            );
        }

        if (currentStep === 'materials') {
            return (
                <CourseNotebookGenerationFields
                    mode={createMode}
                    form={generationForm}
                    onModeChange={handleCreateModeChange}
                    onFormChange={onGenerationFormChange}
                    view="materials"
                />
            );
        }

        if (currentStep === 'settings') {
            return (
                <CourseNotebookGenerationFields
                    mode={createMode}
                    form={generationForm}
                    onModeChange={handleCreateModeChange}
                    onFormChange={onGenerationFormChange}
                    view="settings"
                />
            );
        }

        return <CourseFormAccessSettings course={course} onCourseChange={onCourseChange} />;
    };

    return (
        <DialogContent
            className={cn(
                'flex h-[min(90dvh,calc(100dvh-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-md sm:h-[min(85dvh,calc(100dvh-2rem))] sm:rounded-2xl',
                isEditing ? 'max-w-md' : 'max-w-3xl',
            )}
        >
            <div className="sticky top-0 z-50 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border bg-card/90 px-4 py-3 font-sans backdrop-blur-xl sm:px-6">
                <button onClick={onClose} className="flex h-11 items-center justify-self-start rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25">
                    Отмена
                </button>
                <DialogTitle className="min-w-0 truncate text-center text-base font-semibold text-foreground">
                    {isEditing ? 'Редактирование курса' : 'Новый курс'}
                </DialogTitle>
                <button
                    onClick={handlePrimaryAction}
                    disabled={primaryDisabled}
                    className="flex h-11 items-center justify-self-end rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-30"
                >
                    {isSubmitting ? '...' : isEditing ? 'Сохр.' : isLastStep ? 'Создать' : 'Далее'}
                </button>
            </div>

            <div className="no-scrollbar flex-1 space-y-8 overflow-y-auto px-6 py-8 pb-32">
                {!isEditing && (
                    <CourseFormStepIndicator
                        steps={wizardSteps}
                        currentStep={currentStep}
                        onStepSelect={handleStepSelect}
                    />
                )}

                {isEditing ? (
                    <div className="space-y-10">
                        <CourseFormBasicFields
                            course={course}
                            fileInputRef={fileInputRef}
                            isUploading={isUploading}
                            onCourseChange={onCourseChange}
                            onThumbnailUpload={onThumbnailUpload}
                        />
                        <CourseFormAccessSettings course={course} onCourseChange={onCourseChange} />
                    </div>
                ) : renderCreateStep()}
            </div>

            <div className="sticky bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-xl">
                <div className={cn('grid gap-3', !isEditing && stepIndex > 0 ? 'grid-cols-[0.8fr_1.2fr]' : 'grid-cols-1')}>
                    {!isEditing && stepIndex > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedStep(wizardSteps[Math.max(0, stepIndex - 1)])}
                            className="h-12 rounded-lg text-xs font-medium"
                        >
                            Назад
                        </Button>
                    )}
                    <Button
                        onClick={handlePrimaryAction}
                        disabled={primaryDisabled}
                        className="h-12 w-full rounded-lg bg-primary text-xs font-medium text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.99]"
                    >
                        {isUploading ? 'Загрузка...' : primaryLabel}
                    </Button>
                </div>
            </div>
        </DialogContent>
    );
};
