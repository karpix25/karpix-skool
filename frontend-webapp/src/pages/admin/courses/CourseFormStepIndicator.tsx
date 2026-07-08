import { cn } from '../../../lib/utils';
import { courseFormWizardStepLabels, type CourseFormWizardStep } from './courseFormWizard';

interface CourseFormStepIndicatorProps {
    currentStep: CourseFormWizardStep;
    onStepSelect: (step: CourseFormWizardStep) => void;
    steps: CourseFormWizardStep[];
}

export const CourseFormStepIndicator = ({
    currentStep,
    onStepSelect,
    steps,
}: CourseFormStepIndicatorProps) => {
    const currentIndex = steps.indexOf(currentStep);

    return (
        <div className="grid gap-2 sm:grid-cols-4" aria-label="Этапы создания курса">
            {steps.map((step, index) => {
                const isCurrent = step === currentStep;
                const isComplete = index < currentIndex;
                const isAvailable = index <= currentIndex;

                return (
                    <button
                        key={step}
                        type="button"
                        disabled={!isAvailable}
                        aria-current={isCurrent ? 'step' : undefined}
                        onClick={() => onStepSelect(step)}
                        className={cn(
                            'flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition',
                            isCurrent && 'border-primary bg-primary/10 text-primary',
                            isComplete && 'border-primary/25 bg-primary/5 text-primary',
                            !isCurrent && !isComplete && 'border-border bg-muted/20 text-muted-foreground',
                            isAvailable && 'hover:border-primary/40 hover:bg-primary/5',
                        )}
                    >
                        <span
                            className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px]',
                                isCurrent || isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {index + 1}
                        </span>
                        <span className="truncate">{courseFormWizardStepLabels[step]}</span>
                    </button>
                );
            })}
        </div>
    );
};
