import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OnboardingSupportNote } from './OnboardingSupportNote';

describe('OnboardingSupportNote', () => {
    it('renders the configured support URL as an explicit action', () => {
        render(<OnboardingSupportNote supportUrl="https://t.me/karpix_support" />);

        expect(screen.getByRole('link', { name: /открыть поддержку/i })).toHaveAttribute(
            'href',
            'https://t.me/karpix_support',
        );
    });

    it('explains where to configure support when no URL exists', () => {
        render(<OnboardingSupportNote />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByText(/добавьте HTTPS-ссылку в настройках школы/i)).toBeInTheDocument();
    });
});
