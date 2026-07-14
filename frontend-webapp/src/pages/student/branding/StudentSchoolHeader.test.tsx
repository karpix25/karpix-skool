import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../../context/AuthContext';
import { StudentSchoolHeader } from './StudentSchoolHeader';

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const auth = vi.mocked(useAuth);

describe('StudentSchoolHeader', () => {
    it('shows tenant identity and support without exposing unsafe HTML', () => {
        auth.mockReturnValue({
            tenant: {
                id: 'tenant-1',
                name: 'Школа дизайна',
                description: '<b>Практика каждый день</b>',
                logo_url: 'https://cdn.example.com/logo.png',
                support_url: 'https://t.me/design_support',
            },
        } as ReturnType<typeof useAuth>);

        render(<StudentSchoolHeader />);

        expect(screen.getByAltText('Логотип школы Школа дизайна')).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
        expect(screen.getByText('<b>Практика каждый день</b>')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Открыть поддержку школы' })).toHaveAttribute('href', 'https://t.me/design_support');
    });
});
