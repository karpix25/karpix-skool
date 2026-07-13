import type {
    LessonQuiz,
    LessonQuizQuestion,
    LessonQuizUpsertPayload,
    QuizEditorForm,
    QuizEditorOption,
    QuizEditorQuestion,
    QuizQuestionType,
} from './quizEditorTypes';

const createClientId = (prefix: string) => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createEmptyQuizForm = (): QuizEditorForm => ({
    is_enabled: false,
    is_required: false,
    passing_score_percent: 80,
    allow_retries: true,
    questions: [],
});

export const createQuizOption = (
    orderIndex: number,
    text = '',
    isCorrect = false
): QuizEditorOption => ({
    clientId: createClientId('option'),
    text,
    is_correct: isCorrect,
    order_index: orderIndex,
});

export const createQuizQuestion = (
    orderIndex: number,
    questionType: QuizQuestionType = 'single_choice'
): QuizEditorQuestion => ({
    clientId: createClientId('question'),
    text: '',
    question_type: questionType,
    explanation: '',
    order_index: orderIndex,
    options: questionType === 'short_text'
        ? [createQuizOption(0, '', true)]
        : [createQuizOption(0), createQuizOption(1)],
});

const toEditorOption = (option: LessonQuizQuestion['options'][number], index: number): QuizEditorOption => ({
    clientId: option.id || createClientId('option'),
    id: option.id,
    text: option.text || '',
    is_correct: option.is_correct,
    order_index: Number.isFinite(option.order_index) ? option.order_index : index,
});

const toEditorQuestion = (question: LessonQuizQuestion, index: number): QuizEditorQuestion => ({
    clientId: question.id || createClientId('question'),
    id: question.id,
    text: question.text || '',
    question_type: question.question_type,
    explanation: question.explanation || '',
    order_index: Number.isFinite(question.order_index) ? question.order_index : index,
    options: question.options.map(toEditorOption),
});

export const createQuizFormFromApi = (quiz: LessonQuiz | null): QuizEditorForm => {
    if (!quiz) return createEmptyQuizForm();

    return {
        id: quiz.id,
        is_enabled: quiz.is_enabled,
        is_required: quiz.is_required,
        passing_score_percent: quiz.passing_score_percent,
        allow_retries: quiz.allow_retries,
        questions: quiz.questions.map(toEditorQuestion),
    };
};

export const toLessonQuizPayload = (form: QuizEditorForm): LessonQuizUpsertPayload => ({
    is_enabled: form.is_enabled,
    is_required: form.is_required,
    passing_score_percent: form.passing_score_percent,
    allow_retries: form.allow_retries,
    questions: form.questions.map((question, questionIndex) => ({
        text: question.text.trim(),
        question_type: question.question_type,
        explanation: question.explanation?.trim() || null,
        order_index: questionIndex,
        options: question.options
            .map((option) => ({
                text: option.text.trim(),
                is_correct: question.question_type === 'short_text' ? true : option.is_correct,
            }))
            .filter((option) => option.text.length > 0)
            .map((option, optionIndex) => ({
                ...option,
                order_index: optionIndex,
            })),
    })),
});
