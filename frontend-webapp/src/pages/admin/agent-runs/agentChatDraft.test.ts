import { describe, expect, it } from 'vitest';

import { buildAgentRunCreateInput, createDefaultAgentChatForm, deriveCourseTitle } from './agentChatDraft';
import type { AgentChatFormState } from './types';

describe('agentChatDraft', () => {
    it('derives a readable course title from the admin task', () => {
        expect(deriveCourseTitle('Создай курс по продажам для новичков.')).toBe('продажам для новичков');
        expect(deriveCourseTitle('  Курс про запуск Telegram школы  ')).toBe('запуск Telegram школы');
    });

    it('builds an agent run payload from chat form controls', () => {
        const form: AgentChatFormState = {
            ...createDefaultAgentChatForm(),
            task: 'Создай курс по продажам\nдля малого бизнеса',
            sources: [
                {
                    kind: 'youtube',
                    title: 'Sales video',
                    url: 'https://youtube.com/watch?v=abc',
                },
                {
                    kind: 'note',
                    title: 'Заметка',
                    content: 'Добавить практические примеры.',
                },
            ],
            moduleCount: 20,
            lessonsPerModule: 0,
            isVip: true,
        };

        expect(buildAgentRunCreateInput(form, 'tenant-1')).toMatchObject({
            task_type: 'create_course_draft',
            tenant_id: 'tenant-1',
            course_title: 'продажам',
            description: 'Создай курс по продажам\nдля малого бизнеса',
            cover_url: undefined,
            is_vip: true,
            modules: [],
            sources: [
                {
                    kind: 'youtube',
                    title: 'Sales video',
                    url: 'https://youtube.com/watch?v=abc',
                },
                {
                    kind: 'note',
                    title: 'Заметка',
                    content: 'Добавить практические примеры.',
                },
            ],
            module_count: 12,
            lessons_per_module: 1,
            style: 'практично, простым языком',
            audience_level: 'beginner',
        });
    });

    it('creates starter modules when no source link is provided', () => {
        const payload = buildAgentRunCreateInput(
            {
                ...createDefaultAgentChatForm(),
                task: 'Сделай курс про клиентский сервис',
                moduleCount: 2,
                lessonsPerModule: 3,
            },
            'tenant-1'
        );

        expect(payload.modules).toEqual([
            {
                title: 'Модуль 1',
                lessons: [{ title: 'Урок 1.1' }, { title: 'Урок 1.2' }, { title: 'Урок 1.3' }],
            },
            {
                title: 'Модуль 2',
                lessons: [{ title: 'Урок 2.1' }, { title: 'Урок 2.2' }, { title: 'Урок 2.3' }],
            },
        ]);
    });

    it('can create a course from sources even when the task is empty', () => {
        const payload = buildAgentRunCreateInput(
            {
                ...createDefaultAgentChatForm(),
                task: '',
                sources: [{ kind: 'link', title: 'Материал', url: 'https://example.com/material' }],
            },
            'tenant-1'
        );

        expect(payload.course_title).toBe('Материал');
        expect(payload.modules).toEqual([]);
        expect(payload.sources).toEqual([
            { kind: 'link', title: 'Материал', url: 'https://example.com/material' },
        ]);
    });
});
