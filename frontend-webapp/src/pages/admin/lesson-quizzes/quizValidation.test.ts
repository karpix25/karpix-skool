import { describe, expect, it } from 'vitest';

import { createEmptyQuizForm, createQuizQuestion, toLessonQuizPayload } from './quizDefaults';
import { validateQuizForm } from './quizValidation';

describe('quiz validation', () => {
    it('allows an empty disabled quiz draft', () => {
        expect(validateQuizForm(createEmptyQuizForm())).toEqual({
            isValid: true,
            errors: [],
        });
    });

    it('requires questions when the quiz is enabled', () => {
        const result = validateQuizForm({
            ...createEmptyQuizForm(),
            is_enabled: true,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Добавьте хотя бы один вопрос или выключите тест.');
    });

    it('requires exactly one correct answer for single-choice questions', () => {
        const question = {
            ...createQuizQuestion(0, 'single_choice'),
            text: 'Что важно сделать перед публикацией?',
            options: [
                { ...createQuizQuestion(0).options[0], text: 'Проверить урок', is_correct: true },
                { ...createQuizQuestion(0).options[1], text: 'Сразу опубликовать', is_correct: true },
            ],
        };

        const result = validateQuizForm({
            ...createEmptyQuizForm(),
            is_enabled: true,
            questions: [question],
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Вопрос 1: отметьте ровно один правильный ответ.');
    });

    it('serializes order indexes and trims fields for the API payload', () => {
        const question = {
            ...createQuizQuestion(0, 'multiple_choice'),
            text: ' Что относится к модулю? ',
            explanation: ' Ответ показываем после попытки ',
            options: [
                { ...createQuizQuestion(0).options[0], text: ' Урок ', is_correct: true },
                { ...createQuizQuestion(0).options[1], text: ' Источник ', is_correct: false },
            ],
        };

        expect(toLessonQuizPayload({
            ...createEmptyQuizForm(),
            is_enabled: true,
            is_required: true,
            questions: [question],
        })).toMatchObject({
            is_enabled: true,
            is_required: true,
            passing_score_percent: 80,
            allow_retries: true,
            questions: [{
                text: 'Что относится к модулю?',
                question_type: 'multiple_choice',
                explanation: 'Ответ показываем после попытки',
                order_index: 0,
                options: [
                    { text: 'Урок', is_correct: true, order_index: 0 },
                    { text: 'Источник', is_correct: false, order_index: 1 },
                ],
            }],
        });
    });

    it('drops blank answer options before sending the API payload', () => {
        const question = {
            ...createQuizQuestion(0, 'single_choice'),
            text: 'Что проверяет тест?',
            options: [
                { ...createQuizQuestion(0).options[0], text: ' Понимание ', is_correct: true },
                { ...createQuizQuestion(0).options[1], text: '   ', is_correct: false },
                { ...createQuizQuestion(0).options[1], text: 'Случайность', is_correct: false },
            ],
        };

        const payload = toLessonQuizPayload({
            ...createEmptyQuizForm(),
            is_enabled: true,
            questions: [question],
        });

        expect(payload.questions[0].options).toEqual([
            { text: 'Понимание', is_correct: true, order_index: 0 },
            { text: 'Случайность', is_correct: false, order_index: 1 },
        ]);
    });
});
