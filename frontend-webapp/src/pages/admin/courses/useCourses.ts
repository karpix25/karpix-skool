import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import api from '../../../api/client';
import type { AdminCourse, CourseFormState } from '../../../types/admin';
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
    const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
    const [announcingCourse, setAnnouncingCourse] = useState<AdminCourse | null>(null);
    const [announceMessage, setAnnounceMessage] = useState('');
    const [isAnnouncing, setIsAnnouncing] = useState(false);
    const [newCourse, setNewCourse] = useState<CourseFormState>(createEmptyCourseForm());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        const handleOpenCreate = () => setIsCreateModalOpen(true);
        window.addEventListener('open-create-course', handleOpenCreate);
        return () => window.removeEventListener('open-create-course', handleOpenCreate);
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingCourseId(null);
        setNewCourse(createEmptyCourseForm());
    };

    const handleCreateCourse = async () => {
        if (!newCourse.title) return;
        try {
            const res = await api.post('/courses', newCourse);
            setCourses([res.data, ...courses]);
            closeModal();
            navigate(`/courses/${res.data.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateCourse = async () => {
        if (!newCourse.title || !editingCourseId) return;
        try {
            const res = await api.patch(`/courses/${editingCourseId}`, newCourse);
            setCourses(prev => prev.map(c => c.id === editingCourseId ? res.data : c));
            closeModal();
        } catch (err) {
            console.error(err);
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
            is_vip: course.is_vip || false
        });
        setIsCreateModalOpen(true);
    };

    const handleSubmit = () => {
        if (editingCourseId) handleUpdateCourse();
        else handleCreateCourse();
    };

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
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/courses/${id}`);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDuplicateCourse = async (id: string) => {
        try {
            const res = await api.post(`/courses/${id}/duplicate`);
            setCourses([res.data, ...courses]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleStatus = async (id: string, published: boolean) => {
        try {
            const res = await api.patch(`/courses/${id}`, { is_published: published });
            setCourses(prev => prev.map(c => c.id === id ? { ...c, is_published: res.data.is_published } : c));
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenAnnounceModal = (course: AdminCourse) => {
        setAnnouncingCourse(course);
        setAnnounceMessage('');
        setIsAnnounceModalOpen(true);
    };

    const handleAnnounce = async () => {
        if (!announcingCourse || isAnnouncing) return;
        setIsAnnouncing(true);
        try {
            await api.post(`/courses/${announcingCourse.id}/announce`, { message: announceMessage });
            setIsAnnounceModalOpen(false);
            setAnnouncingCourse(null);
            setAnnounceMessage('');
            alert('Анонс успешно отправлен в Telegram!');
        } catch (err) {
            console.error(err);
            const detail = axios.isAxiosError<{ detail?: string }>(err)
                ? err.response?.data?.detail || 'Ошибка при отправке анонса.'
                : 'Ошибка при отправке анонса.';
            alert(detail);
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
        isAnnounceModalOpen,
        announcingCourse,
        announceMessage,
        isAnnouncing,
        newCourse,
        filteredCourses,
        navigate,
        setSearchQuery,
        setActiveFilter,
        setIsCreateModalOpen,
        setIsAnnounceModalOpen,
        setAnnounceMessage,
        setNewCourse,
        closeModal,
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
