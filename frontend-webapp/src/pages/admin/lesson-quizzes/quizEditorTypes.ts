export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'short_text';

export interface LessonQuizOption {
    id?: string;
    text: string;
    is_correct: boolean;
    order_index: number;
}

export interface LessonQuizQuestion {
    id?: string;
    text: string;
    question_type: QuizQuestionType;
    explanation?: string | null;
    order_index: number;
    options: LessonQuizOption[];
}

export interface LessonQuiz {
    id?: string;
    lesson_id: string;
    is_enabled: boolean;
    is_required: boolean;
    passing_score_percent: number;
    allow_retries: boolean;
    questions: LessonQuizQuestion[];
}

export type LessonQuizUpsertPayload = Omit<LessonQuiz, 'id' | 'lesson_id'>;

export interface QuizEditorOption extends LessonQuizOption {
    clientId: string;
}

export interface QuizEditorQuestion extends Omit<LessonQuizQuestion, 'options'> {
    clientId: string;
    options: QuizEditorOption[];
}

export interface QuizEditorForm {
    id?: string;
    is_enabled: boolean;
    is_required: boolean;
    passing_score_percent: number;
    allow_retries: boolean;
    questions: QuizEditorQuestion[];
}

export interface QuizValidationResult {
    isValid: boolean;
    errors: string[];
}
