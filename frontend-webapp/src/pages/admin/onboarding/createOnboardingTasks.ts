import { BookOpenCheck, Building2, CreditCard, ExternalLink, MessageSquare, Plus, UserPlus } from 'lucide-react';

import type { OnboardingProgressSnapshot, OnboardingTask } from './types';

interface CreateOnboardingTasksOptions extends OnboardingProgressSnapshot {
    hasTelegramGroup: boolean;
}

export const createOnboardingTasks = ({
    hasSchoolProfile,
    hasServingSubscription,
    hasTelegramGroup,
    coursesCount,
    publishedCourseId,
    studentsCount,
    hasStudentPreview,
}: CreateOnboardingTasksOptions): OnboardingTask[] => {
    const hasCourse = coursesCount > 0;
    const hasPublishedLesson = Boolean(publishedCourseId);
    const hasStudent = studentsCount > 0;

    return [
        {
            id: 'school_profile',
            title: 'Заполнить профиль школы',
            description: 'Добавьте содержательное описание школы и HTTPS-ссылку поддержки. Логотип и цвет можно настроить позже.',
            icon: Building2,
            actionLabel: 'Открыть настройки',
            path: '/settings',
            state: hasSchoolProfile ? 'completed' : 'available',
            required: true,
        },
        {
            id: 'subscription',
            title: 'Проверить пробный доступ или тариф',
            description: 'Убедитесь, что пробный период или оплаченный тариф активен и школа доступна для изменений.',
            icon: CreditCard,
            actionLabel: 'Открыть настройки',
            path: '/settings',
            state: hasServingSubscription ? 'completed' : 'available',
            required: true,
        },
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
            actionLabel: hasPublishedLesson ? 'Открыть и подтвердить' : undefined,
            path: publishedCourseId ? `/course/${publishedCourseId}` : undefined,
            state: hasStudentPreview ? 'completed' : hasPublishedLesson ? 'guidance' : 'locked',
            required: true,
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
