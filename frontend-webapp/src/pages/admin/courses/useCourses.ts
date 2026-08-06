import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../../api/client';
import type { AdminCourse, CourseFormState } from '../../../types/admin';
import { createDefaultCourseStructureGenerationForm } from '../course-generation/courseStructureGenerationForm';
import { hasCourseGenerationSources } from '../course-sources/sourceValidation';
import type { CourseCreateMode } from './CourseNotebookGenerationFields';
import { createCourseWithGeneration } from './createCourseWithGeneration';
import { getCourseErrorMessage, type CourseFeedback, type CourseFeedbackScope } from './courseFeedback';
import { createEmptyCourseForm } from './courseOptions';
import type { FilterType } from './types';

export const useCourses = () => {
    const [courses, setCourses] = useState<AdminCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
    const [announcingCourse, setAnnouncingCourse] = useState<AdminCourse | null>(null);
    const [announceMessage, setAnnounceMessage] = useState('');
    const [isAnnouncing, setIsAnnouncing] = useState(false);
    const [newCourse, setNewCourse] = useState<CourseFormState>(createEmptyCourseForm());
    const [createMode, setCreateMode] = useState<CourseCreateMode>('blank');
    const [generationForm, setGenerationForm] = useState(createDefaultCourseStructureGenerationForm());
    const [feedback, setFeedback] = useState<CourseFeedback | null>(null);
    const feedbackIdRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const showFeedback = useCallback((nextFeedback: Omit<CourseFeedback, 'id'>) => {
        feedbackIdRef.current += 1;
        setFeedback({ ...nextFeedback, id: feedbackIdRef.current });
    }, []);

    const showSuccess = useCallback((title: string, description?: string, scope: CourseFeedbackScope = 'page') => {
        showFeedback({ scope, variant: 'success', title, description });
    }, [showFeedback]);

    const showError = useCallback((
        error: unknown,
        title: string,
        fallback: string,
        scope: CourseFeedbackScope = 'page'
    ) => {
        showFeedback({
            scope,
            variant: 'error',
            title,
            description: getCourseErrorMessage(error, fallback),
        });
    }, [showFeedback]);

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
            showError(err, 'Не удалось загрузить курсы', 'Проверьте соединение и попробуйте обновить страницу.');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    useEffect(() => {
        const handleOpenCreate = () => setIsCreateModalOpen(true);
        window.addEventListener('open-create-course', handleOpenCreate);
        return () => window.removeEventListener('open-create-course', handleOpenCreate);
    }, []);

    const clearFeedback = () => setFeedback(null);

    const clearAnnounceFeedback = () => {
        setFeedback(prev => prev?.scope === 'announce' ? null : prev);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingCourseId(null);
        setNewCourse(createEmptyCourseForm());
        setCreateMode('blank');
        setGenerationForm(createDefaultCourseStructureGenerationForm());
    };

    const handleCreateCourse = async () => {
        if (!canSubmitCourse || isSubmitting) return;
        try {
            setIsSubmitting(true);
            const result = await createCourseWithGeneration({
                course: newCourse,
                mode: createMode,
                generationForm,
            });
            setCourses(prev => [result.course, ...prev]);
            showSuccess(
                'Курс создан',
                createMode === 'source' ? 'Генерация папок и уроков запущена.' : 'Открываю страницу нового курса.'
            );
            closeModal();
            navigate(
                result.generationJobId
                    ? `/courses/${result.course.id}?generationJobId=${result.generationJobId}`
                    : `/courses/${result.course.id}`
            );
        } catch (err) {
            console.error(err);
            showError(err, 'Курс не создан', 'Не удалось создать курс. Попробуйте еще раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCourse = async () => {
        if (!newCourse.title || !editingCourseId || isSubmitting) return;
        try {
            setIsSubmitting(true);
            const res = await api.patch(`/courses/${editingCourseId}`, newCourse);
            setCourses(prev => prev.map(c => c.id === editingCourseId ? res.data : c));
            showSuccess('Курс обновлен', 'Изменения сохранены.');
            closeModal();
        } catch (err) {
            console.error(err);
            showError(err, 'Курс не обновлен', 'Не удалось сохранить изменения. Попробуйте еще раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenEditModal = (course: AdminCourse) => {
        setEditingCourseId(course.id);
        setNewCourse({
            title: course.title,
            description: course.description || '',
            cover_url: course.cover_url || '',
            unlock_type: course.unlock_type === 'level_based' || course.unlock_type === 'time_relative' ? course.unlock_type : 'open',
            unlock_value: (course.unlock_value || '1').toString(),
            is_published: course.is_published,
            is_vip: course.is_vip || false,
            content_type: course.content_type === 'guide' || course.content_type === 'prompt' || course.content_type === 'checklist'
                ? course.content_type
                : 'course',
            category: course.category || '',
            tags: course.tags || [],
        });
        setIsCreateModalOpen(true);
    };

    const handleSubmit = () => {
        if (editingCourseId) handleUpdateCourse();
        else handleCreateCourse();
    };

    const canSubmitCourse = Boolean(
        newCourse.title.trim() &&
        (
            editingCourseId ||
            createMode === 'blank' ||
	            hasCourseGenerationSources(generationForm.sources)
        )
    );

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.url) {
                setNewCourse(prev => ({ ...prev, cover_url: res.data.url }));
                showSuccess('Обложка загружена', 'Изображение добавлено к форме курса.');
            } else {
                showFeedback({
                    scope: 'page',
                    variant: 'error',
                    title: 'Обложка не загружена',
                    description: 'Сервер не вернул ссылку на файл.',
                });
            }
        } catch (err) {
            console.error('Upload failed:', err);
            showError(err, 'Обложка не загружена', 'Не удалось загрузить изображение. Попробуйте другой файл.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/courses/${id}`);
            setCourses(prev => prev.filter(c => c.id !== id));
            showSuccess('Курс удален', 'Список курсов обновлен.');
        } catch (err) {
            console.error(err);
            showError(err, 'Курс не удален', 'Не удалось удалить курс. Попробуйте еще раз.');
        }
    };

    const handleDuplicateCourse = async (id: string) => {
        try {
            const res = await api.post(`/courses/${id}/duplicate`);
            setCourses(prev => [res.data, ...prev]);
            showSuccess('Курс продублирован', 'Копия добавлена в начало списка.');
        } catch (err) {
            console.error(err);
            showError(err, 'Курс не продублирован', 'Не удалось создать копию курса. Попробуйте еще раз.');
        }
    };

    const handleToggleStatus = async (id: string, published: boolean) => {
        try {
            const res = await api.patch(`/courses/${id}`, { is_published: published });
            setCourses(prev => prev.map(c => c.id === id ? { ...c, is_published: res.data.is_published } : c));
            showSuccess(
                published ? 'Курс опубликован' : 'Курс снят с публикации',
                'Статус курса обновлен.'
            );
        } catch (err) {
            console.error(err);
            showError(err, 'Статус не обновлен', 'Не удалось изменить статус курса. Попробуйте еще раз.');
        }
    };

    const handleOpenAnnounceModal = (course: AdminCourse) => {
        clearAnnounceFeedback();
        setAnnouncingCourse(course);
        setAnnounceMessage('');
        setIsAnnounceModalOpen(true);
    };

    const closeAnnounceModal = () => {
        setIsAnnounceModalOpen(false);
        setAnnouncingCourse(null);
        setAnnounceMessage('');
        clearAnnounceFeedback();
    };

    const handleAnnounce = async () => {
        if (!announcingCourse || isAnnouncing) return;
        setIsAnnouncing(true);
        try {
            await api.post(`/courses/${announcingCourse.id}/announce`, { message: announceMessage });
            closeAnnounceModal();
            showSuccess('Анонс отправлен', 'Сообщение опубликовано в Telegram.');
        } catch (err) {
            console.error(err);
            showError(err, 'Анонс не отправлен', 'Ошибка при отправке анонса.', 'announce');
        } finally {
            setIsAnnouncing(false);
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (course.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (activeFilter === 'All') return matchesSearch;
            if (activeFilter === 'Published') return matchesSearch && course.is_published;
            if (activeFilter === 'Draft') return matchesSearch && !course.is_published;
            return matchesSearch;
        });
    }, [courses, searchQuery, activeFilter]);

    return {
        loading,
        searchQuery,
        activeFilter,
        isCreateModalOpen,
        editingCourseId,
        fileInputRef,
        isUploading,
        isSubmitting,
        isAnnounceModalOpen,
        announcingCourse,
        announceMessage,
        isAnnouncing,
        newCourse,
        createMode,
        generationForm,
        canSubmitCourse,
        filteredCourses,
        pageFeedback: feedback?.scope === 'page' ? feedback : null,
        announceFeedback: feedback?.scope === 'announce' ? feedback : null,
        navigate,
        setSearchQuery,
        setActiveFilter,
        setIsCreateModalOpen,
        setAnnounceMessage,
        setNewCourse,
        setCreateMode,
        setGenerationForm,
        clearFeedback,
        closeModal,
        closeAnnounceModal,
        handleSubmit,
        handleThumbnailUpload,
        handleDeleteCourse,
        handleDuplicateCourse,
        handleToggleStatus,
        handleOpenEditModal,
        handleOpenAnnounceModal,
        handleAnnounce,
    };
};
