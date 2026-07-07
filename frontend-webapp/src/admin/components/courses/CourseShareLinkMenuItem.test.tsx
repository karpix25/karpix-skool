import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { copyShareLinkUrl } from '../../../lib/shareLinks';
import { getCourseShareLink } from '../../../services/deepLinks';
import { CourseShareLinkMenuItem } from './CourseShareLinkMenuItem';

vi.mock('../../../services/deepLinks', () => ({
    getCourseShareLink: vi.fn(),
}));

vi.mock('../../../lib/shareLinks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../lib/shareLinks')>();
    return {
        ...actual,
        copyShareLinkUrl: vi.fn(),
    };
});

const courseId = '22222222-2222-4222-8222-222222222222';
const courseUrl = `https://t.me/karpix_shkola_bot/karpix?startapp=course_${courseId}`;

const renderMenu = (isPublished = true) => render(
    <DropdownMenu>
        <DropdownMenuTrigger>Открыть</DropdownMenuTrigger>
        <DropdownMenuContent>
            <CourseShareLinkMenuItem courseId={courseId} isPublished={isPublished} />
        </DropdownMenuContent>
    </DropdownMenu>
);

describe('CourseShareLinkMenuItem', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.mocked(getCourseShareLink).mockReset();
        vi.mocked(copyShareLinkUrl).mockReset();
    });

    it('copies the course Mini App share URL', async () => {
        vi.mocked(getCourseShareLink).mockResolvedValue({
            url: courseUrl,
            start_param: `course_${courseId}`,
        });
        vi.mocked(copyShareLinkUrl).mockResolvedValue('copied');
        const user = userEvent.setup();

        renderMenu();

        await user.click(screen.getByRole('button', { name: 'Открыть' }));
        await user.click(await screen.findByText('Ссылка на курс'));

        expect(getCourseShareLink).toHaveBeenCalledWith(courseId);
        await waitFor(() => {
            expect(copyShareLinkUrl).toHaveBeenCalledWith(courseUrl);
        });
    });

    it('does not create dead public links for draft courses', async () => {
        const user = userEvent.setup();

        renderMenu(false);

        await user.click(screen.getByRole('button', { name: 'Открыть' }));

        expect(await screen.findByText('Опубликуйте курс')).toBeInTheDocument();
        expect(getCourseShareLink).not.toHaveBeenCalled();
        expect(copyShareLinkUrl).not.toHaveBeenCalled();
    });
});
