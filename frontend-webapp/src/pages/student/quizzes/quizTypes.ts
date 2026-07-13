import type { LessonCompletionResponse } from '../../../types/course';

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'short_text';

export interface QuizOption {
    id: string;
    text: string;
    order_index: number;
}

export interface LessonQuizQuestion {
    id: string;
    text: string;
    question_type: QuizQuestionType;
    explanation?: string | null;
    order_index: number;
    options: QuizOption[];
}

export interface LessonQuizData {
    id: string;
    lesson_id: string;
    is_required: boolean;
    passing_score_percent: number;
    allow_retries: boolean;
    questions: LessonQuizQuestion[];
}

export interface LessonQuizAttemptSummary {
    id: string;
    score_percent: number;
    passed: boolean;
    created_at: string;
}

export interface LessonQuizResponse {
    quiz: LessonQuizData | null;
    latest_attempt?: LessonQuizAttemptSummary | null;
}

export interface LessonQuizAnswer {
    question_id: string;
    selected_option_ids?: string[];
    text_answer?: string;
}

export interface LessonQuizAttemptPayload {
    answers: LessonQuizAnswer[];
}

export interface LessonQuizQuestionResult {
    question_id: string;
    is_correct?: boolean;
    correct?: boolean;
    explanation?: string | null;
    correct_option_ids?: string[];
    selected_option_ids?: string[];
}

export interface LessonQuizAttemptResult {
    attempt_id: string;
    score_percent: number;
    passed: boolean;
    correct_count: number;
    total_questions: number;
    question_results?: LessonQuizQuestionResult[];
    xp_granted?: number;
    new_xp?: number | null;
    new_level?: number | null;
    newly_rewarded_question_ids?: string[];
    already_rewarded_question_ids?: string[];
    completion_result?: LessonCompletionResponse | null;
}

export interface QuizAnswerDraft {
    selectedOptionIds: string[];
    textAnswer: string;
}

export type QuizAnswerDrafts = Record<string, QuizAnswerDraft>;
