import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CoursePagination } from './CoursePagination';

describe('CoursePagination', () => {
    it('does not render for a single page', () => {
        render(<CoursePagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);

        expect(screen.queryByRole('navigation', { name: 'Страницы курсов' })).not.toBeInTheDocument();
    });

    it('moves between course pages', async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(<CoursePagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);

        await user.click(screen.getByRole('button', { name: 'Предыдущая страница курсов' }));
        await user.click(screen.getByRole('button', { name: 'Следующая страница курсов' }));

        expect(screen.getByText('2 / 4')).toBeInTheDocument();
        expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
        expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    });
});
