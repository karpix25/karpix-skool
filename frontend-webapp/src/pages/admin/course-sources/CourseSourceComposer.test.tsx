import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CourseSourceComposer } from './CourseSourceComposer';

describe('CourseSourceComposer', () => {
    it('adds a YouTube source without submitting an enclosing form', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onParentSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
        });

        render(
            <form onSubmit={onParentSubmit}>
                <CourseSourceComposer sources={[]} onChange={onChange} />
                <button type="submit">Submit parent form</button>
            </form>
        );

        await user.click(screen.getByRole('button', { name: 'YouTube' }));
        await user.type(
            screen.getByPlaceholderText('https://youtube.com/watch?v=...'),
            'https://youtu.be/dvm3nqVlzuo?si=8usvwJ9XOA8Bi5Gf'
        );
        await user.type(screen.getByPlaceholderText('Название источника'), 'YouTube dvm3nqVlzuo');
        await user.click(screen.getByRole('button', { name: 'Добавить источник' }));

        expect(onParentSubmit).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith([
            expect.objectContaining({
                kind: 'youtube',
                title: 'YouTube dvm3nqVlzuo',
                url: 'https://youtu.be/dvm3nqVlzuo?si=8usvwJ9XOA8Bi5Gf',
            }),
        ]);
    });
});
