import { describe, expect, it } from 'vitest';

import { getUserDisplayName, getUserInitials, getUserSecondaryLabel } from './userDisplay';
import type { WebAppUser } from '../types/auth';

const user = (overrides: Partial<WebAppUser>): WebAppUser => ({
    id: 'user-1',
    ...overrides,
});

describe('userDisplay', () => {
    it('prefers telegram username for the primary display name', () => {
        expect(getUserDisplayName(user({
            username: 'karpix',
            first_name: 'Карло',
            last_name: 'Пикс',
        }))).toBe('karpix');
    });

    it('falls back to first and last name when username is missing', () => {
        expect(getUserDisplayName(user({
            first_name: 'Карло',
            last_name: 'Пикс',
        }))).toBe('Карло Пикс');
        expect(getUserInitials(user({
            first_name: 'Карло',
            last_name: 'Пикс',
        }))).toBe('КП');
    });

    it('keeps avatar fallback non-empty for sparse telegram profiles', () => {
        expect(getUserDisplayName(user({ telegram_id: 42 }))).toBe('Пользователь');
        expect(getUserSecondaryLabel(user({ telegram_id: 42 }))).toBe('Telegram ID 42');
        expect(getUserInitials(user({}))).toBe('U');
    });
});
