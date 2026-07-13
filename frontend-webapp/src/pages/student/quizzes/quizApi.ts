import api from '../../../api/client';
import type { LessonQuizAttemptPayload, LessonQuizAttemptResult, LessonQuizResponse } from './quizTypes';

export const fetchLessonQuiz = async (lessonId: string): Promise<LessonQuizResponse> => {
    const response = await api.get<LessonQuizResponse>(`/webapp/lessons/${lessonId}/quiz`);
    return response.data;
};

export const submitLessonQuizAttempt = async (
    lessonId: string,
    payload: LessonQuizAttemptPayload,
): Promise<LessonQuizAttemptResult> => {
    const response = await api.post<LessonQuizAttemptResult>(
        `/webapp/lessons/${lessonId}/quiz/attempts`,
        payload,
    );
    return response.data;
};
