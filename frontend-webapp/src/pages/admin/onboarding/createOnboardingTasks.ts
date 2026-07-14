import { BookOpenCheck, ExternalLink, MessageSquare, Plus, UserPlus } from 'lucide-react';

import type { OnboardingProgressSnapshot, OnboardingTask } from './types';

interface CreateOnboardingTasksOptions extends OnboardingProgressSnapshot {
    hasTelegramGroup: boolean;
}

export const createOnboardingTasks = ({
    hasTelegramGroup,
    coursesCount,
    publishedCourseId,
    studentsCount,
}: CreateOnboardingTasksOptions): OnboardingTask[] => {
    const hasCourse = coursesCount > 0;
    const hasPublishedLesson = Boolean(publishedCourseId);
    const hasStudent = studentsCount > 0;

    return [
        {
            id: 'telegram_group',
            title: 'Подключить Telegram-группу',
            description: 'Добавьте бота Karpix в группу и привяжите её к этой школе в настройках.',
            icon: MessageSquare,
            actionLabel: 'Открыть настройки',
            path: '/settings',
            state: hasTelegramGroup ? 'completed' : 'available',
            required: true,
        },
        {
            id: 'course',
            title: 'Создать первый курс',
            description: 'Создайте структуру курса и добавьте в неё первый урок.',
            icon: Plus,
            actionLabel: 'Открыть курсы',
            path: '/courses',
            state: hasCourse ? 'completed' : 'available',
            required: true,
        },
        {
            id: 'published_lesson',
            title: 'Опубликовать первый урок',
            description: 'Опубликуйте курс и хотя бы один урок, чтобы ученики смогли его открыть.',
            icon: BookOpenCheck,
            actionLabel: hasCourse ? 'Перейти к курсу' : undefined,
            path: hasCourse ? '/courses' : undefined,
            state: hasPublishedLesson ? 'completed' : hasCourse ? 'available' : 'locked',
            required: true,
        },
        {
            id: 'student_preview',
            title: 'Проверить путь ученика',
            description: hasPublishedLesson
                ? 'Откройте опубликованный курс и пройдите первый урок так, как его увидит ученик.'
                : 'После публикации здесь появится вход в курс в режиме ученика.',
            icon: ExternalLink,
            actionLabel: hasPublishedLesson ? 'Открыть как ученик' : undefined,
            path: publishedCourseId ? `/course/${publishedCourseId}` : undefined,
            state: hasPublishedLesson ? 'guidance' : 'locked',
            required: false,
        },
        {
            id: 'student',
            title: 'Пригласить первого ученика',
            description: hasPublishedLesson
                ? 'Скопируйте ссылку курса в разделе «Контент» и отправьте её ученику в Telegram.'
                : 'Ссылка для приглашения будет полезна после публикации первого урока.',
            icon: UserPlus,
            actionLabel: hasPublishedLesson ? 'Получить ссылку' : undefined,
            path: hasPublishedLesson ? '/courses' : undefined,
            state: hasStudent ? 'completed' : hasPublishedLesson ? 'available' : 'locked',
            required: true,
        },
    ];
};
