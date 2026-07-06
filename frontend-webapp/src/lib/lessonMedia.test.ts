import { describe, expect, it } from 'vitest';

import {
    getLessonMediaAlignClass,
    getLessonMediaWidthClass,
    isSafeLessonMediaAlign,
    isSafeLessonMediaWidth,
    normalizeLessonMediaAlign,
    normalizeLessonMediaWidth,
} from './lessonMedia';

describe('lessonMedia', () => {
    it('normalizes editor media values to supported controls', () => {
        expect(normalizeLessonMediaWidth('50%')).toBe('50%');
        expect(normalizeLessonMediaWidth('999%')).toBe('100%');
        expect(normalizeLessonMediaAlign('right')).toBe('right');
        expect(normalizeLessonMediaAlign('wide')).toBe('center');
    });

    it('validates the broader sanitizer media attribute contract', () => {
        expect(isSafeLessonMediaWidth('75%')).toBe(true);
        expect(isSafeLessonMediaWidth('640px')).toBe(true);
        expect(isSafeLessonMediaWidth('2001px')).toBe(false);
        expect(isSafeLessonMediaWidth('101%')).toBe(false);
        expect(isSafeLessonMediaAlign('wide')).toBe(true);
        expect(isSafeLessonMediaAlign('expression(alert(1))')).toBe(false);
    });

    it('maps controls to stable editor layout classes', () => {
        expect(getLessonMediaWidthClass('35%')).toContain('w-[35%]');
        expect(getLessonMediaAlignClass('center')).toBe('mx-auto');
    });
});
