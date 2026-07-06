import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MediaNodeToolbar } from './MediaNodeToolbar';

describe('MediaNodeToolbar', () => {
    it('opens compact media settings in a bottom sheet', () => {
        const onAlignChange = vi.fn();
        const onDelete = vi.fn();
        const onOpen = vi.fn();
        const onWidthChange = vi.fn();

        render(
            <MediaNodeToolbar
                align="center"
                isOpen={false}
                width="75%"
                onAlignChange={onAlignChange}
                onDelete={onDelete}
                onOpen={onOpen}
                onOpenChange={vi.fn()}
                onWidthChange={onWidthChange}
            />
        );

        expect(screen.getByRole('button', { name: /75% · центр/i })).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: 'Настройки медиа' })).not.toBeInTheDocument();
    });

    it('runs media actions from the sheet', () => {
        const onAlignChange = vi.fn();
        const onDelete = vi.fn();
        const onOpen = vi.fn();
        const onOpenChange = vi.fn();
        const onWidthChange = vi.fn();

        render(
            <MediaNodeToolbar
                align="center"
                isOpen
                width="75%"
                onAlignChange={onAlignChange}
                onDelete={onDelete}
                onOpen={onOpen}
                onOpenChange={onOpenChange}
                onWidthChange={onWidthChange}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Настройки медиа' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '50%' }));
        expect(onWidthChange).toHaveBeenCalledWith('50%');

        fireEvent.click(screen.getByRole('button', { name: /Слева/i }));
        expect(onAlignChange).toHaveBeenCalledWith('left');

        fireEvent.click(screen.getByRole('button', { name: 'Открыть' }));
        expect(onOpen).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
        expect(onDelete).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
