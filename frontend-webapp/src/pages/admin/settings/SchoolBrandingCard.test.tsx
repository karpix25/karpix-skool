import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import type { AdminTenant } from '../../../types/admin';
import { SchoolBrandingCard } from './SchoolBrandingCard';

vi.mock('../../../api/client', () => ({
    default: { patch: vi.fn() },
}));

const apiPatch = vi.mocked(api.patch);

const tenant: AdminTenant = {
    id: 'tenant-1',
    name: 'Школа',
    logo_url: null,
    accent_color: null,
    support_url: null,
};

describe('SchoolBrandingCard', () => {
    beforeEach(() => {
        apiPatch.mockReset();
    });

    it('validates HTTPS URLs and #RRGGBB before saving', async () => {
        const user = userEvent.setup();
        render(<SchoolBrandingCard tenant={tenant} onTenantChange={vi.fn()} />);

        const logoInput = screen.getByLabelText('Логотип');
        const colorInput = screen.getByLabelText('Фирменный цвет');
        const supportInput = screen.getByLabelText('Поддержка учеников');

        await user.type(logoInput, 'http://example.com/logo.png');
        fireEvent.blur(logoInput);
        await user.type(colorInput, '#12345');
        fireEvent.blur(colorInput);
        await user.type(supportInput, 'https://user:secret@example.com/help');
        fireEvent.blur(supportInput);

        expect(screen.getByText(/Ссылка на логотип должна быть публичной HTTPS-ссылкой/)).toBeInTheDocument();
        expect(screen.getByText(/Цвет должен быть записан в формате #RRGGBB/)).toBeInTheDocument();
        expect(screen.getByText(/Ссылка поддержки.*без логина и пароля/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Сохранить оформление' })).toBeDisabled();
        expect(apiPatch).not.toHaveBeenCalled();
    });

    it('previews only valid branding and saves normalized values', async () => {
        const user = userEvent.setup();
        const onTenantChange = vi.fn();
        apiPatch.mockResolvedValue({
            data: {
                ...tenant,
                logo_url: 'https://cdn.example.com/logo.png',
                accent_color: '#A1B2C3',
                support_url: 'https://t.me/school_support',
            },
        });
        render(<SchoolBrandingCard tenant={tenant} onTenantChange={onTenantChange} />);

        await user.type(screen.getByLabelText('Логотип'), 'https://cdn.example.com/logo.png');
        await user.type(screen.getByLabelText('Фирменный цвет'), '#a1b2c3');
        await user.type(screen.getByLabelText('Поддержка учеников'), 'https://t.me/school_support');

        expect(screen.getByAltText('Предпросмотр логотипа школы')).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
        expect(screen.getByTestId('branding-accent-preview')).toHaveStyle({ backgroundColor: '#A1B2C3' });
        expect(screen.getByRole('link', { name: /Проверить поддержку/ })).toHaveAttribute('href', 'https://t.me/school_support');

        await user.click(screen.getByRole('button', { name: 'Сохранить оформление' }));

        await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/tenants/tenant-1', {
            logo_url: 'https://cdn.example.com/logo.png',
            accent_color: '#A1B2C3',
            support_url: 'https://t.me/school_support',
        }));
        expect(onTenantChange).toHaveBeenCalledWith(expect.objectContaining({
            logo_url: 'https://cdn.example.com/logo.png',
            accent_color: '#A1B2C3',
            support_url: 'https://t.me/school_support',
        }));
        expect(await screen.findByRole('button', { name: 'Сохранено' })).toBeDisabled();
    });

    it('sends nulls when existing branding is cleared', async () => {
        const user = userEvent.setup();
        const brandedTenant: AdminTenant = {
            ...tenant,
            logo_url: 'https://cdn.example.com/logo.png',
            accent_color: '#123456',
            support_url: 'https://t.me/support',
        };
        apiPatch.mockResolvedValue({ data: { ...brandedTenant, logo_url: null, accent_color: null, support_url: null } });
        render(<SchoolBrandingCard tenant={brandedTenant} onTenantChange={vi.fn()} />);

        await user.clear(screen.getByLabelText('Логотип'));
        await user.clear(screen.getByLabelText('Фирменный цвет'));
        await user.clear(screen.getByLabelText('Поддержка учеников'));
        await user.click(screen.getByRole('button', { name: 'Сохранить оформление' }));

        await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/tenants/tenant-1', {
            logo_url: null,
            accent_color: null,
            support_url: null,
        }));
    });

    it('shows a request error and keeps the form editable', async () => {
        const user = userEvent.setup();
        apiPatch.mockRejectedValue(new Error('Сервис временно недоступен'));
        render(<SchoolBrandingCard tenant={tenant} onTenantChange={vi.fn()} />);

        await user.type(screen.getByLabelText('Фирменный цвет'), '#123456');
        await user.click(screen.getByRole('button', { name: 'Сохранить оформление' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Сервис временно недоступен');
        expect(screen.getByLabelText('Фирменный цвет')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Сохранить оформление' })).toBeEnabled();
    });
});
