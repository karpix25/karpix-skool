import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HorizontalRail } from './horizontal-rail';

describe('HorizontalRail', () => {
    it('renders a contained horizontal scroll region', () => {
        render(
            <HorizontalRail role="group" aria-label="Фильтры">
                <button type="button">Все</button>
            </HorizontalRail>
        );

        const rail = screen.getByRole('group', { name: 'Фильтры' });
        expect(rail).toHaveClass('overflow-x-auto');
        expect(rail).toHaveClass('overscroll-x-contain');
        expect(rail).toHaveClass('no-scrollbar');
        expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument();
    });

    it('merges container and content classes', () => {
        render(
            <HorizontalRail
                data-testid="rail"
                className="snap-x"
                contentClassName="rounded-xl"
            >
                <span>Item</span>
            </HorizontalRail>
        );

        const rail = screen.getByTestId('rail');
        expect(rail).toHaveClass('snap-x');
        expect(rail.firstElementChild).toHaveClass('rounded-xl');
        expect(rail.firstElementChild).toHaveClass('min-w-full');
    });
});
