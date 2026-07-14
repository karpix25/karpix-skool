import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateTenant } from '../../../services/tenants';
import { SchoolProfileCard } from './SchoolProfileCard';

vi.mock('../../../services/tenants', () => ({ updateTenant: vi.fn() }));

const updateSchool = vi.mocked(updateTenant);

describe('SchoolProfileCard', () => {
    beforeEach(() => updateSchool.mockReset());

    it('trims and saves the school description with the profile', async () => {
        updateSchool.mockResolvedValue({ id: 'tenant-1', name: 'Новая школа', description: 'Практика для дизайнеров' });
        const onTenantChange = vi.fn();
        render(<SchoolProfileCard tenant={{ id: 'tenant-1', name: 'Школа' }} onTenantChange={onTenantChange} />);

        const user = userEvent.setup();
        await user.clear(screen.getByLabelText('Название школы'));
        await user.type(screen.getByLabelText('Название школы'), '  Новая школа  ');
        await user.type(screen.getByLabelText('Описание школы'), '  Практика для дизайнеров  ');
        await user.click(screen.getByRole('button', { name: 'Сохранить профиль' }));

        await waitFor(() => expect(updateSchool).toHaveBeenCalledWith('tenant-1', {
            name: 'Новая школа',
            description: 'Практика для дизайнеров',
            vip_group_link: null,
        }));
        expect(onTenantChange).toHaveBeenCalledWith(expect.objectContaining({ description: 'Практика для дизайнеров' }));
    });
});
