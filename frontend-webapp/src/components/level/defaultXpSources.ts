import type { WebAppXpSource } from '../../types/levels';

export const DEFAULT_XP_SOURCES: WebAppXpSource[] = [
    {
        source_type: 'lesson',
        title: 'Завершение урока',
        description: 'Начисляется один раз за первый проход урока.',
        points: 10,
    },
    {
        source_type: 'message',
        title: 'Сообщение в группе школы',
        description: 'Считается только в привязанной Telegram-группе.',
        points: 1,
        limit: 'до 20 XP в час',
    },
    {
        source_type: 'reaction',
        title: 'Реакция на ваше сообщение',
        description: 'Начисляется автору сообщения, когда на него реагируют.',
        points: 2,
    },
];
