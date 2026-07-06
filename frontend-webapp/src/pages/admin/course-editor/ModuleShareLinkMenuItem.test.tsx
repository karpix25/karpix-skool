import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { copyShareLinkUrl } from '../../../lib/shareLinks';
import { getModuleShareLink } from '../../../services/deepLinks';
import { ModuleShareLinkMenuItem } from './ModuleShareLinkMenuItem';

vi.mock('../../../services/deepLinks', () => ({
    getModuleShareLink: vi.fn(),
}));

vi.mock('../../../lib/shareLinks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../lib/shareLinks')>();
    return {
        ...actual,
        copyShareLinkUrl: vi.fn(),
    };
});

const moduleUrl = 'https://t.me/karpix_shkola_bot?start=module_33333333-3333-4333-8333-333333333333';

const renderMenu = () => render(
    <DropdownMenu>
        <DropdownMenuTrigger>Открыть</DropdownMenuTrigger>
        <DropdownMenuContent>
            <ModuleShareLinkMenuItem moduleId="33333333-3333-4333-8333-333333333333" />
        </DropdownMenuContent>
    </DropdownMenu>
);

describe('ModuleShareLinkMenuItem', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.mocked(getModuleShareLink).mockReset();
        vi.mocked(copyShareLinkUrl).mockReset();
    });

    it('copies the API share URL without converting bot funnel links', async () => {
        vi.mocked(getModuleShareLink).mockResolvedValue({
            url: moduleUrl,
            start_param: 'module_33333333-3333-4333-8333-333333333333',
        });
        vi.mocked(copyShareLinkUrl).mockResolvedValue('copied');
        const user = userEvent.setup();

        renderMenu();

        await user.click(screen.getByRole('button', { name: 'Открыть' }));
        await user.click(await screen.findByText('Ссылка для соцсетей'));

        expect(getModuleShareLink).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
        await waitFor(() => {
            expect(copyShareLinkUrl).toHaveBeenCalledWith(moduleUrl);
        });
    });
});
