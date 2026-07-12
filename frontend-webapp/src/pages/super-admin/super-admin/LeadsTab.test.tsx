import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeadsTab } from './LeadsTab';
import type { SuperAdminLead } from './types';

const authorRequest: SuperAdminLead = {
    id: 'author-user-1',
    kind: 'author_request',
    name: 'karlo25',
    telegram: '@karlo25',
    schoolName: null,
    description: null,
    status: 'rejected',
    adminNote: null,
    createdAt: '2026-07-12T16:40:00',
    handledAt: null,
    source: 'Mini App',
    userId: 'user-1',
    leadId: null,
};

describe('LeadsTab', () => {
    it('keeps application card actions vertically balanced', () => {
        render(
            <LeadsTab
                leads={[authorRequest]}
                isLoading={false}
                error={null}
                onRefresh={vi.fn()}
                onUpdateStatus={vi.fn()}
            />
        );

        expect(screen.getByTestId('lead-card-author-user-1')).toHaveClass('md:items-center');
        expect(screen.getByTestId('lead-actions-panel-author-user-1')).toHaveClass('justify-center');
        expect(screen.getByTestId('lead-actions-panel-author-user-1')).toHaveClass('md:min-h-36');
        expect(screen.getByTestId('lead-actions-grid-author-user-1')).not.toHaveClass('pt-1');
        expect(screen.getByRole('button', { name: /Одобрить/i })).toBeInTheDocument();
    });
});
