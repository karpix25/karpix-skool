import { describe, expect, it } from 'vitest';

import { getSchoolRefFromStartParam, parseStartParamDeepLink } from './deepLinks';


const lessonId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const moduleId = '33333333-3333-4333-8333-333333333333';

describe('deep link start params', () => {
    it('parses lesson start params', () => {
        expect(parseStartParamDeepLink(`lesson_${lessonId}`)).toEqual({
            type: 'lesson',
            lessonId,
        });
    });

    it('does not treat lesson params as school refs', () => {
        expect(getSchoolRefFromStartParam(`lesson_${lessonId}`)).toBeUndefined();
        expect(getSchoolRefFromStartParam('lesson_not-a-uuid')).toBeUndefined();
    });

    it('parses course start params', () => {
        expect(parseStartParamDeepLink(`course_${courseId}`)).toEqual({
            type: 'course',
            courseId,
        });
        expect(getSchoolRefFromStartParam(`course_${courseId}`)).toBeUndefined();
        expect(getSchoolRefFromStartParam('course_not-a-uuid')).toBeUndefined();
    });

    it('parses module start params', () => {
        expect(parseStartParamDeepLink(`module_${moduleId}`)).toEqual({
            type: 'module',
            moduleId,
        });
        expect(getSchoolRefFromStartParam(`module_${moduleId}`)).toBeUndefined();
        expect(getSchoolRefFromStartParam('module_not-a-uuid')).toBeUndefined();
    });

    it('keeps existing school setup params working', () => {
        expect(parseStartParamDeepLink('setup-code-123')).toBeNull();
        expect(getSchoolRefFromStartParam('setup-code-123')).toBe('setup-code-123');
    });
});
