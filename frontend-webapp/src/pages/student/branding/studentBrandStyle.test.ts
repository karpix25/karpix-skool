import { describe, expect, it } from 'vitest';

import { getStudentBrandStyle } from './studentBrandStyle';

describe('getStudentBrandStyle', () => {
    it('applies only a safe six-digit hex accent', () => {
        expect(getStudentBrandStyle('#12ABEF')).toMatchObject({ '--color-primary': '#12ABEF' });
        expect(getStudentBrandStyle('red')).toEqual({});
        expect(getStudentBrandStyle('url(javascript:alert(1))')).toEqual({});
    });
});
