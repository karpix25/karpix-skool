import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MySchoolTab } from './MySchoolTab';
import type { SuperActivityItem, Tenant } from './types';

const school: Tenant = {
    id: 'tenant-1',
    name: 'Школа ремонта',
    owner_email: null,
    owner_username: 'owner',
    owner_telegram_id: null,
    subscription_status: 'active',
    expires_at: null,
    member_count: 12,
    course_count: 2,
    onboarding_stage: 'launched',
    has_telegram_group: true,
    has_published_lesson: true,
    student_count: 10,
    setup_code: 'START-masked-code',
    telegram_group_id: 123,
};

const activity: SuperActivityItem[] = [
    {
        id: 'event-1',
        occurredAt: '2026-07-14T12:00:00Z',
        type: 'school',
        eventType: 'school.updated',
        tone: 'success',
        title: 'Настройки школы обновлены',
        message: 'Изменения сохранены.',
        tenantName: school.name,
    },
    {
        id: 'event-2',
        occurredAt: '2026-07-14T13:00:00Z',
        type: 'school',
        eventType: 'school.updated',
        tone: 'info',
        title: 'Событие другой школы',
        message: 'Не должно отображаться.',
        tenantName: 'Другая школа',
    },
];

describe('MySchoolTab', () => {
    it('shows only real events for the selected school and hides legacy setup codes', () => {
        render(
            <MySchoolTab
                school={school}
                tenants={[school]}
                selectedTenantId={school.id}
                onSelectTenant={vi.fn()}
                activity={activity}
                isActivityLoading={false}
                activityError={null}
                onRefreshActivity={vi.fn()}
            />
        );

        expect(screen.getByText('Настройки школы обновлены')).toBeInTheDocument();
        expect(screen.queryByText('Событие другой школы')).not.toBeInTheDocument();
        expect(screen.queryByText('START-masked-code')).not.toBeInTheDocument();
        expect(screen.queryByText(/tg_user_/)).not.toBeInTheDocument();
        expect(screen.getByText('Владелец: @owner')).toBeInTheDocument();
    });
});
