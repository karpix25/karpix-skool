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

    it('opens the quiz in a modal and shows the result on the lesson page', async () => {
        const onLessonCompleted = vi.fn();
        vi.mocked(fetchLessonQuiz).mockResolvedValue({ quiz, latest_attempt: null });
        vi.mocked(submitLessonQuizAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            score_percent: 100,
            passed: true,
            correct_count: 3,
            total_questions: 3,
            xp_granted: 6,
            newly_rewarded_question_ids: ['question-1', 'question-2', 'question-3'],
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
        expect(screen.queryByText('Какой инструмент открывает Mini App?')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Пройти тест' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Вопрос 1 из 3')).toBeInTheDocument();
        expect(screen.queryByText('Что относится к уроку?')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Следующий вопрос' })).toBeDisabled();
        await userEvent.click(screen.getByRole('radio', { name: 'Telegram' }));
        await userEvent.click(screen.getByRole('button', { name: 'Следующий вопрос' }));
        expect(screen.getByText('Вопрос 2 из 3')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
        expect(screen.getByRole('radio', { name: 'Telegram' })).toHaveAttribute('aria-checked', 'true');
        await userEvent.click(screen.getByRole('button', { name: 'Следующий вопрос' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Контент' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Файлы' }));
        await userEvent.click(screen.getByRole('button', { name: 'Следующий вопрос' }));
        expect(screen.getByText('Вопрос 3 из 3')).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText('Ответ на вопрос 3'), 'Главный вывод');
        await userEvent.click(screen.getByRole('button', { name: 'Завершить тест' }));

        await waitFor(() => {
            expect(submitLessonQuizAttempt).toHaveBeenCalledWith('lesson-1', {
                answers: [
                    { question_id: 'question-1', selected_option_ids: ['option-1'] },
                    { question_id: 'question-2', selected_option_ids: ['option-3', 'option-4'] },
                    { question_id: 'question-3', text_answer: 'Главный вывод' },
                ],
            });
        });
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(await screen.findByText('Тест сдан')).toBeInTheDocument();
        expect(screen.getByText('3 из 3 правильных ответов')).toBeInTheDocument();
        expect(screen.getByText('+6 XP за новые правильные ответы')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Пройти тест снова' })).toBeInTheDocument();
        expect(onLessonCompleted).toHaveBeenCalledTimes(1);
    });

    it('renders failed attempt details on the lesson page without completing the lesson', async () => {
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

        await userEvent.click(await screen.findByRole('button', { name: 'Пройти тест' }));
        await userEvent.click(await screen.findByRole('radio', { name: 'Email' }));
        await userEvent.click(screen.getByRole('button', { name: 'Завершить тест' }));

        expect(await screen.findByText('Нужно попробовать еще раз')).toBeInTheDocument();
        expect(screen.getByText('Правильный ответ: Telegram')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Пройти тест снова' })).toBeInTheDocument();
        expect(onLessonCompleted).not.toHaveBeenCalled();
    });

    it('disables the launcher when a final attempt has already been used', async () => {
        vi.mocked(fetchLessonQuiz).mockResolvedValue({
            quiz: { ...quiz, allow_retries: false },
            latest_attempt: {
                id: 'attempt-final',
                score_percent: 80,
                passed: true,
                created_at: '2026-07-13T10:00:00Z',
            },
        });

        render(<LessonQuiz lessonId="lesson-1" />);

        const startButton = await screen.findByRole('button', { name: 'Попытка использована' });
        expect(startButton).toBeDisabled();
        expect(screen.getByText('Последняя попытка: 80% · сдано')).toBeInTheDocument();
    });
});
