import { describe, expect, it, vi } from 'vitest';

import { startStudentPreview } from './startStudentPreview';

describe('startStudentPreview', () => {
    it('initiates navigation before confirming the server event', async () => {
        const order: string[] = [];
        const navigate = vi.fn(() => { order.push('navigate'); });
        const confirmPreview = vi.fn(async () => {
            order.push('confirm');
            return true;
        });

        expect(await startStudentPreview({ path: '/course/course-1', navigate, confirmPreview })).toBe(true);
        expect(order).toEqual(['navigate', 'confirm']);
    });

    it('does not confirm preview when navigation cannot be initiated', async () => {
        const navigate = vi.fn(() => { throw new Error('navigation unavailable'); });
        const confirmPreview = vi.fn();

        expect(await startStudentPreview({ path: '/course/course-1', navigate, confirmPreview })).toBe(false);
        expect(confirmPreview).not.toHaveBeenCalled();
    });
});
