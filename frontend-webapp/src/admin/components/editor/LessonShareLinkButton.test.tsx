import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonShareLinkButton } from './LessonShareLinkButton';
import { copyShareLinkUrl } from '../../../lib/shareLinks';
import { getLessonShareLink } from '../../../services/deepLinks';

vi.mock('../../../services/deepLinks', () => ({
    getLessonShareLink: vi.fn(),
}));

vi.mock('../../../lib/shareLinks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../lib/shareLinks')>();
    return {
        ...actual,
        copyShareLinkUrl: vi.fn(),
    };
});

describe('LessonShareLinkButton', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.mocked(getLessonShareLink).mockReset();
        vi.mocked(copyShareLinkUrl).mockReset();
    });

    it('shows the lesson link manually when clipboard fallback is needed', async () => {
        const lessonUrl = 'https://t.me/karpix_shkola_bot?start=lesson_11111111-1111-4111-8111-111111111111';
        vi.mocked(getLessonShareLink).mockResolvedValue({
            url: lessonUrl,
            start_param: 'lesson_11111111-1111-4111-8111-111111111111',
        });
        vi.mocked(copyShareLinkUrl).mockResolvedValue('manual');
        const user = userEvent.setup();

        render(<LessonShareLinkButton lessonId="11111111-1111-4111-8111-111111111111" />);

        await user.click(screen.getByRole('button', { name: 'Скопировать ссылку для соцсетей' }));

        expect(await screen.findByDisplayValue(lessonUrl)).toBeInTheDocument();
        expect(getLessonShareLink).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    });

    it('copies the API share URL without converting bot funnel links', async () => {
        const lessonUrl = 'https://t.me/karpix_shkola_bot?start=lesson_11111111-1111-4111-8111-111111111111';
        vi.mocked(getLessonShareLink).mockResolvedValue({
            url: lessonUrl,
            start_param: 'lesson_11111111-1111-4111-8111-111111111111',
        });
        vi.mocked(copyShareLinkUrl).mockResolvedValue('copied');
        const user = userEvent.setup();

        render(<LessonShareLinkButton lessonId="11111111-1111-4111-8111-111111111111" />);

        await user.click(screen.getByRole('button', { name: 'Скопировать ссылку для соцсетей' }));

        await waitFor(() => {
            expect(copyShareLinkUrl).toHaveBeenCalledWith(lessonUrl);
        });
    });
});
