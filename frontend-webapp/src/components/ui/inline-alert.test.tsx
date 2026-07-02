import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InlineAlert } from './inline-alert';

describe('InlineAlert', () => {
    it('renders error messages as assertive alerts', () => {
        render(
            <InlineAlert
                variant="error"
                title="Ошибка"
                description="Не удалось сохранить курс"
            />
        );

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        expect(screen.getByText('Ошибка')).toBeInTheDocument();
        expect(screen.getByText('Не удалось сохранить курс')).toBeInTheDocument();
    });

    it('calls onDismiss when the dismiss button is clicked', async () => {
        const user = userEvent.setup();
        const onDismiss = vi.fn();

        render(<InlineAlert title="Готово" onDismiss={onDismiss} />);

        await user.click(screen.getByRole('button', { name: 'Скрыть сообщение' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
