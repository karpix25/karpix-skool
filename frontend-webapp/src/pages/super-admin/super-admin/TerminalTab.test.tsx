import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TerminalTab } from './TerminalTab';
import type { SuperActivityItem } from './types';

const events: SuperActivityItem[] = [
    {
        id: 'event-1',
        occurredAt: '2026-07-14T12:00:00Z',
        type: 'system',
        eventType: 'system.updated',
        tone: 'info',
        title: 'Настройки обновлены',
        message: 'Реальное событие журнала.',
    },
    {
        id: 'event-2',
        occurredAt: '2026-07-14T13:00:00Z',
        type: 'lead',
        eventType: 'lead.created',
        tone: 'success',
        title: 'Новая заявка',
        message: 'Получена заявка.',
    },
];

describe('TerminalTab', () => {
    it('reports the real activity count instead of an invented uptime metric', () => {
        render(
            <TerminalTab
                tenants={[]}
                users={[]}
                applications={[]}
                activity={events}
                isActivityLoading={false}
                activityError={null}
                onRefreshActivity={vi.fn()}
                time="14:30:00"
            />
        );

        expect(screen.getByText('Событий: 2')).toBeInTheDocument();
        expect(screen.queryByText('99.9%')).not.toBeInTheDocument();
        expect(screen.getByText('Реальное событие журнала.')).toBeInTheDocument();
    });
});
