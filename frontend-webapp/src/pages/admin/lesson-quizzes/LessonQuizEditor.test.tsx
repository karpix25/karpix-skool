import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonQuizEditor } from './LessonQuizEditor';
import { fetchLessonQuiz, saveLessonQuiz } from './quizEditorApi';

vi.mock('./quizEditorApi', () => ({
    fetchLessonQuiz: vi.fn(),
    saveLessonQuiz: vi.fn(),
}));

describe('LessonQuizEditor', () => {
    beforeEach(() => {
        vi.mocked(fetchLessonQuiz).mockReset();
        vi.mocked(saveLessonQuiz).mockReset();
    });

    it('creates a lesson quiz payload from admin input', async () => {
        vi.mocked(fetchLessonQuiz).mockResolvedValue(null);
        vi.mocked(saveLessonQuiz).mockResolvedValue({
            id: 'quiz-1',
            lesson_id: 'lesson-1',
            is_enabled: true,
            is_required: true,
            passing_score_percent: 70,
            allow_retries: false,
            questions: [{
                id: 'question-1',
                text: 'Что сохраняем в Karpix?',
                question_type: 'single_choice',
                explanation: null,
                order_index: 0,
                options: [
                    { id: 'option-1', text: 'Урок', is_correct: true, order_index: 0 },
                    { id: 'option-2', text: 'Случайный источник', is_correct: false, order_index: 1 },
                ],
            }],
        });
        const user = userEvent.setup();

        render(<LessonQuizEditor lessonId="lesson-1" />);

        await screen.findByText('Ручная проверка знаний после урока.');
        await user.click(screen.getByRole('switch', { name: 'Показывать тест ученикам' }));
        await user.click(screen.getByRole('switch', { name: 'Сделать тест обязательным' }));
        await user.click(screen.getByRole('switch', { name: 'Разрешить повторные попытки' }));
        await user.clear(screen.getByLabelText('Проходной %'));
        await user.type(screen.getByLabelText('Проходной %'), '70');

        await user.click(screen.getByRole('button', { name: 'Добавить вопрос' }));
        await user.type(screen.getByPlaceholderText('Что должен понять ученик после урока?'), 'Что сохраняем в Karpix?');
        await user.type(screen.getByPlaceholderText('Вариант 1'), 'Урок');
        await user.type(screen.getByPlaceholderText('Вариант 2'), 'Случайный источник');
        await user.click(screen.getByRole('button', { name: 'Отметить вариант 1 правильным' }));
        await user.click(screen.getByRole('button', { name: 'Сохранить тест' }));

        await waitFor(() => {
            expect(saveLessonQuiz).toHaveBeenCalledWith('lesson-1', {
                is_enabled: true,
                is_required: true,
                passing_score_percent: 70,
                allow_retries: false,
                questions: [{
                    text: 'Что сохраняем в Karpix?',
                    question_type: 'single_choice',
                    explanation: null,
                    order_index: 0,
                    options: [
                        { text: 'Урок', is_correct: true, order_index: 0 },
                        { text: 'Случайный источник', is_correct: false, order_index: 1 },
                    ],
                }],
            });
        });
    });
});
