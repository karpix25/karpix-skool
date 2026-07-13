import axios from 'axios';
import api from '../../../api/client';
import type { LessonQuiz, LessonQuizUpsertPayload } from './quizEditorTypes';

export const fetchLessonQuiz = async (lessonId: string): Promise<LessonQuiz | null> => {
    try {
        const response = await api.get<LessonQuiz | null>(`/courses/lessons/${lessonId}/quiz`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
    }
};

export const saveLessonQuiz = async (
    lessonId: string,
    payload: LessonQuizUpsertPayload
): Promise<LessonQuiz> => {
    const response = await api.put<LessonQuiz>(`/courses/lessons/${lessonId}/quiz`, payload);
    return response.data;
};

export const generateLessonQuiz = async (
    lessonId: string,
    replaceExisting: boolean
): Promise<LessonQuiz> => {
    const response = await api.post<LessonQuiz>(`/courses/lessons/${lessonId}/quiz/generate`, {
        replace_existing: replaceExisting,
    });
    return response.data;
};
