import { describe, expect, it } from 'vitest';

import { getCourseFormPrimaryLabel, getCourseFormWizardSteps } from './courseFormWizard';

describe('course form wizard', () => {
    it('keeps blank course creation short', () => {
        expect(getCourseFormWizardSteps('blank')).toEqual(['course', 'access']);
    });

    it('adds material and generation settings steps for source-based courses', () => {
        expect(getCourseFormWizardSteps('source')).toEqual(['course', 'materials', 'settings', 'access']);
    });

    it('uses action labels that match the current wizard state', () => {
        expect(getCourseFormPrimaryLabel(false, false, false)).toBe('Далее');
        expect(getCourseFormPrimaryLabel(false, true, false)).toBe('Создать курс');
        expect(getCourseFormPrimaryLabel(true, true, false)).toBe('Сохранить');
    });
});
