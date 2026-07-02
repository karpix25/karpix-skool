import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { getApiErrorMessage } from './apiError';

const makeAxiosError = (data?: { detail?: string }, message = 'Request failed') => ({
    isAxiosError: true,
    message,
    response: {
        data,
    },
    toJSON: () => ({}),
}) as AxiosError<{ detail?: string }>;

describe('getApiErrorMessage', () => {
    it('prefers backend detail from axios responses', () => {
        expect(getApiErrorMessage(makeAxiosError({ detail: 'Нет доступа' }))).toBe('Нет доступа');
    });

    it('falls back to axios message and default message', () => {
        expect(getApiErrorMessage(makeAxiosError(undefined, 'Network Error'))).toBe('Network Error');
        expect(getApiErrorMessage(null, 'Не удалось выполнить запрос')).toBe('Не удалось выполнить запрос');
    });

    it('returns native error messages', () => {
        expect(getApiErrorMessage(new Error('Сессия истекла'))).toBe('Сессия истекла');
    });
});
