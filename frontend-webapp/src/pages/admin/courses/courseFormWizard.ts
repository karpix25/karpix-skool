import type { CourseCreateMode } from './CourseNotebookGenerationFields';

export type CourseFormWizardStep = 'course' | 'materials' | 'settings' | 'access';

export const courseFormWizardStepLabels: Record<CourseFormWizardStep, string> = {
    course: 'Курс',
    materials: 'Материалы',
    settings: 'Настройки',
    access: 'Доступ',
};

export const getCourseFormWizardSteps = (mode: CourseCreateMode): CourseFormWizardStep[] => (
    mode === 'source'
        ? ['course', 'materials', 'settings', 'access']
        : ['course', 'access']
);

export const getCourseFormPrimaryLabel = (
    isEditing: boolean,
    isLastStep: boolean,
    isSubmitting: boolean,
) => {
    if (isSubmitting) return isEditing ? 'Сохранение...' : 'Создание...';
    if (isEditing) return 'Сохранить';
    return isLastStep ? 'Создать курс' : 'Далее';
};
