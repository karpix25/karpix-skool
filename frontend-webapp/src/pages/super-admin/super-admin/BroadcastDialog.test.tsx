import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BroadcastDialog } from './BroadcastDialog';

describe('BroadcastDialog', () => {
    it('shows an honest unavailable state without a fake send action', () => {
        render(<BroadcastDialog open onOpenChange={vi.fn()} />);

        expect(screen.getByText('Рассылка пока недоступна')).toBeInTheDocument();
        expect(screen.getByText(/Сообщения отсюда не отправляются/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Отправить' })).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
    });
});
