import type { QuizEditorForm, QuizEditorQuestion, QuizValidationResult } from './quizEditorTypes';

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

const validateChoiceQuestion = (question: QuizEditorQuestion, position: number, errors: string[]) => {
    const filledOptions = question.options.filter((option) => hasText(option.text));
    const correctOptions = filledOptions.filter((option) => option.is_correct);

    if (filledOptions.length < 2) {
        errors.push(`Вопрос ${position}: добавьте минимум два варианта ответа.`);
    }

    if (question.question_type === 'single_choice' && correctOptions.length !== 1) {
        errors.push(`Вопрос ${position}: отметьте ровно один правильный ответ.`);
    }

    if (question.question_type === 'multiple_choice' && correctOptions.length < 1) {
        errors.push(`Вопрос ${position}: отметьте хотя бы один правильный ответ.`);
    }
};

const validateShortTextQuestion = (question: QuizEditorQuestion, position: number, errors: string[]) => {
    const acceptedAnswers = question.options.filter((option) => hasText(option.text));

    if (acceptedAnswers.length < 1) {
        errors.push(`Вопрос ${position}: добавьте хотя бы один принимаемый текстовый ответ.`);
    }
};

export const validateQuizForm = (form: QuizEditorForm): QuizValidationResult => {
    const errors: string[] = [];

    if (!Number.isFinite(form.passing_score_percent) || form.passing_score_percent < 1 || form.passing_score_percent > 100) {
        errors.push('Проходной процент должен быть от 1 до 100.');
    }

    if (form.is_enabled && form.questions.length === 0) {
        errors.push('Добавьте хотя бы один вопрос или выключите тест.');
    }

    form.questions.forEach((question, index) => {
        const position = index + 1;

        if (!hasText(question.text)) {
            errors.push(`Вопрос ${position}: заполните текст вопроса.`);
        }

        if (question.question_type === 'short_text') {
            validateShortTextQuestion(question, position, errors);
            return;
        }

        validateChoiceQuestion(question, position, errors);
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};
