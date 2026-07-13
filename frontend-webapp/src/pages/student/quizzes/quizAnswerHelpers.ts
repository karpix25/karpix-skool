import type {
    LessonQuizAnswer,
    LessonQuizAttemptResult,
    LessonQuizAttemptSummary,
    LessonQuizData,
    QuizAnswerDraft,
    QuizAnswerDrafts,
} from './quizTypes';

export const emptyAnswer: QuizAnswerDraft = { selectedOptionIds: [], textAnswer: '' };

export const buildInitialAnswers = (quiz: LessonQuizData): QuizAnswerDrafts => (
    Object.fromEntries(quiz.questions.map((question) => [question.id, emptyAnswer]))
);

export const hasAnswer = (answer: QuizAnswerDraft, questionType: string) => {
    if (questionType === 'short_text') return answer.textAnswer.trim().length > 0;
    return answer.selectedOptionIds.length > 0;
};

export const buildPayloadAnswers = (
    quiz: LessonQuizData,
    answers: QuizAnswerDrafts,
): LessonQuizAnswer[] => (
    quiz.questions.map((question) => {
        const answer = answers[question.id] || emptyAnswer;
        if (question.question_type === 'short_text') {
            return { question_id: question.id, text_answer: answer.textAnswer.trim() };
        }
        return { question_id: question.id, selected_option_ids: answer.selectedOptionIds };
    })
);

export const isQuizAttemptPassed = (
    quiz: LessonQuizData,
    attempt: LessonQuizAttemptResult | LessonQuizAttemptSummary,
) => attempt.score_percent >= quiz.passing_score_percent;

export const hasUsedFinalAttempt = (
    quiz: LessonQuizData,
    attemptResult: LessonQuizAttemptResult | null,
    latestAttempt: LessonQuizAttemptSummary | null,
) => !quiz.allow_retries && Boolean(attemptResult || latestAttempt);

export const getQuizStartLabel = (
    quiz: LessonQuizData,
    attemptResult: LessonQuizAttemptResult | null,
    latestAttempt: LessonQuizAttemptSummary | null,
) => {
    if (hasUsedFinalAttempt(quiz, attemptResult, latestAttempt)) return 'Попытка использована';
    if (attemptResult || latestAttempt) return 'Пройти тест снова';
    return 'Пройти тест';
};
