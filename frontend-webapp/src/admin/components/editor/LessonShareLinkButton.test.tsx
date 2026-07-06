import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonShareLinkButton } from './LessonShareLinkButton';
import { getLessonShareLink } from '../../../services/deepLinks';

vi.mock('../../../services/deepLinks', () => ({
    getLessonShareLink: vi.fn(),
}));

const lessonUrl = 'https://t.me/karpix_shkola_bot/karpix?startapp=lesson_11111111-1111-4111-8111-111111111111';

const blockClipboard = () => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
        },
    });
};

describe('LessonShareLinkButton', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.mocked(getLessonShareLink).mockReset();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('shows the lesson link manually when clipboard is blocked', async () => {
        vi.mocked(getLessonShareLink).mockResolvedValue({
            url: lessonUrl,
            start_param: 'lesson_11111111-1111-4111-8111-111111111111',
        });
        const user = userEvent.setup();
        blockClipboard();

        render(<LessonShareLinkButton lessonId="11111111-1111-4111-8111-111111111111" />);

        await user.click(screen.getByRole('button', { name: 'Скопировать ссылку на урок' }));

        expect(await screen.findByDisplayValue(lessonUrl)).toBeInTheDocument();
        expect(getLessonShareLink).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    });
});
