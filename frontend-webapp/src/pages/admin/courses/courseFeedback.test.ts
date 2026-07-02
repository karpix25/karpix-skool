import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { getCourseErrorMessage } from './courseFeedback';

const makeAxiosError = (
    data?: { detail?: unknown; message?: unknown; error?: unknown },
    message = 'Request failed',
) => ({
    isAxiosError: true,
    message,
    response: {
        data,
    },
    toJSON: () => ({}),
}) as AxiosError<{ detail?: unknown; message?: unknown; error?: unknown }>;

describe('getCourseErrorMessage', () => {
    it('uses trimmed backend detail first', () => {
        const error = makeAxiosError({ detail: '  Название курса обязательно  ' });

        expect(getCourseErrorMessage(error, 'Ошибка')).toBe('Название курса обязательно');
    });

    it('uses backend message or error when detail is missing', () => {
        expect(getCourseErrorMessage(makeAxiosError({ message: 'Курс не найден' }), 'Ошибка')).toBe('Курс не найден');
        expect(getCourseErrorMessage(makeAxiosError({ error: 'Нет прав' }), 'Ошибка')).toBe('Нет прав');
    });

    it('falls back for empty or non-string payloads', () => {
        expect(getCourseErrorMessage(makeAxiosError({ detail: ['bad'] }), 'Не удалось сохранить')).toBe('Request failed');
        expect(getCourseErrorMessage(null, 'Не удалось сохранить')).toBe('Не удалось сохранить');
    });
});
