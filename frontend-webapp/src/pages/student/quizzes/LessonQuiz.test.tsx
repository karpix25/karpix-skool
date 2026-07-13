import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LessonQuiz } from './LessonQuiz';
import { fetchLessonQuiz, submitLessonQuizAttempt } from './quizApi';
import type { LessonQuizData } from './quizTypes';

vi.mock('./quizApi', () => ({
    fetchLessonQuiz: vi.fn(),
    submitLessonQuizAttempt: vi.fn(),
}));

const quiz: LessonQuizData = {
    id: 'quiz-1',
    lesson_id: 'lesson-1',
    is_required: true,
    passing_score_percent: 70,
    allow_retries: true,
    questions: [
        {
            id: 'question-1',
            text: 'Какой инструмент открывает Mini App?',
            question_type: 'single_choice',
            order_index: 1,
            options: [
                { id: 'option-1', text: 'Telegram', order_index: 1 },
                { id: 'option-2', text: 'Email', order_index: 2 },
            ],
        },
        {
            id: 'question-2',
            text: 'Что относится к уроку?',
            question_type: 'multiple_choice',
            order_index: 2,
            options: [
                { id: 'option-3', text: 'Контент', order_index: 1 },
                { id: 'option-4', text: 'Файлы', order_index: 2 },
            ],
        },
        {
            id: 'question-3',
            text: 'Коротко опишите вывод',
            question_type: 'short_text',
            order_index: 3,
            options: [],
        },
    ],
};

describe('LessonQuiz', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('loads quiz questions and submits selected answers', async () => {
        const onLessonCompleted = vi.fn();
        vi.mocked(fetchLessonQuiz).mockResolvedValue({ quiz, latest_attempt: null });
        vi.mocked(submitLessonQuizAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            score_percent: 100,
            passed: true,
            correct_count: 3,
            total_questions: 3,
            question_results: [
                { question_id: 'question-1', is_correct: true, explanation: 'Верно' },
            ],
            completion_result: {
                xp_granted: 25,
                new_xp: 125,
                new_level: 2,
                module_progress: {
                    module_id: 'module-1',
                    title: 'Модуль',
                    total_lessons: 1,
                    completed_lessons: 1,
                    progress_percent: 100,
                },
                course_progress: {
                    course_id: 'course-1',
                    total_lessons: 1,
                    completed_lessons: 1,
                    progress_percent: 100,
                },
            },
        });

        render(<LessonQuiz lessonId="lesson-1" onLessonCompleted={onLessonCompleted} />);

        expect(await screen.findByRole('heading', { name: 'Тест по уроку' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('radio', { name: 'Telegram' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Контент' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Файлы' }));
        await userEvent.type(screen.getByLabelText('Ответ на вопрос 3'), 'Главный вывод');
        await userEvent.click(screen.getByRole('button', { name: 'Отправить ответы' }));

        await waitFor(() => {
            expect(submitLessonQuizAttempt).toHaveBeenCalledWith('lesson-1', {
                answers: [
                    { question_id: 'question-1', selected_option_ids: ['option-1'] },
                    { question_id: 'question-2', selected_option_ids: ['option-3', 'option-4'] },
                    { question_id: 'question-3', text_answer: 'Главный вывод' },
                ],
            });
        });
        expect(await screen.findByText('Тест сдан')).toBeInTheDocument();
        expect(screen.getByText('3 из 3 правильных ответов')).toBeInTheDocument();
        expect(onLessonCompleted).toHaveBeenCalledTimes(1);
    });

    it('renders failed attempt details without completing the lesson', async () => {
        const onLessonCompleted = vi.fn();
        vi.mocked(fetchLessonQuiz).mockResolvedValue({ quiz: { ...quiz, questions: [quiz.questions[0]] } });
        vi.mocked(submitLessonQuizAttempt).mockResolvedValue({
            attempt_id: 'attempt-2',
            score_percent: 0,
            passed: false,
            correct_count: 0,
            total_questions: 1,
            question_results: [
                { question_id: 'question-1', is_correct: false, explanation: 'Правильный ответ: Telegram' },
            ],
        });

        render(<LessonQuiz lessonId="lesson-1" onLessonCompleted={onLessonCompleted} />);

        await userEvent.click(await screen.findByRole('radio', { name: 'Email' }));
        await userEvent.click(screen.getByRole('button', { name: 'Отправить ответы' }));

        expect(await screen.findByText('Нужно попробовать еще раз')).toBeInTheDocument();
        expect(screen.getByText('Правильный ответ: Telegram')).toBeInTheDocument();
        expect(onLessonCompleted).not.toHaveBeenCalled();
    });
});
