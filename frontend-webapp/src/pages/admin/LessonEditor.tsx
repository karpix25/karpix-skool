import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../api/client';
import LessonEditorHeader from '../../admin/components/editor/LessonEditorHeader';

const RichTextEditor = lazy(() =>
    import('../../admin/components/editor/RichTextEditor').then((module) => ({
        default: module.RichTextEditor,
    }))
);

export const LessonEditor: React.FC = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Extract moduleId from query for new lessons
    const queryParams = new URLSearchParams(location.search);
    const moduleId = queryParams.get('moduleId');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [videoProvider, setVideoProvider] = useState('youtube_unlisted');
    const [videoId, setVideoId] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchLesson = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/courses/lessons/${lessonId}`);
            const l = res.data;
            setTitle(l.title);
            setContent(l.content || '');
            setVideoProvider(l.video_provider || 'youtube_unlisted');
            setVideoId(l.video_id || '');
            setIsPublished(l.is_published);
            setUpdatedAt(l.updated_at);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [lessonId]);

    useEffect(() => {
        if (lessonId && lessonId !== 'new') {
            fetchLesson();
        } else {
            setIsLoading(false);
            setTitle('');
        }
    }, [fetchLesson, lessonId]);

    const handleSave = async (publish = false) => {
        try {
            setIsSaving(true);
            const payload = {
                title: title || 'Без названия',
                content,
                video_provider: videoProvider,
                video_id: videoId,
                is_published: publish ? true : isPublished,
            };

            let updatedLesson;
            if (lessonId && lessonId !== 'new') {
                const res = await api.patch(`/courses/lessons/${lessonId}`, payload);
                updatedLesson = res.data;
            } else if (moduleId) {
                const res = await api.post(`/courses/modules/${moduleId}/lessons`, payload);
                updatedLesson = res.data;
            }

            if (updatedLesson) {
                setUpdatedAt(updatedLesson.updated_at);
            }

            if (publish) navigate(`/courses/${courseId}`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 size={32} className="animate-spin text-primary/40" />
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Подготовка редактора</span>
        </div>
    );

    const handleDelete = async () => {
        try {
            await api.delete(`/courses/lessons/${lessonId}`);
            navigate(`/courses/${courseId}`);
        } catch (err) {
            console.error('Failed to delete lesson:', err);
            alert('Не удалось удалить урок. Пожалуйста, попробуйте еще раз.');
        }
    };

    return (
        <div className="bg-[#fafafa] dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col animate-in fade-in duration-700">
            <LessonEditorHeader
                title={title}
                courseId={courseId!}
                lessonId={lessonId}
                onPublish={() => handleSave(true)}
                onDelete={handleDelete}
                updatedAt={updatedAt}
                isSaving={isSaving}
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-4xl mx-auto px-6 py-4 space-y-6">
                    {/* Main Content Area */}
                    <div className="space-y-6">

                        <Suspense
                            fallback={(
                                <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <Loader2 size={28} className="animate-spin text-primary/40" />
                                    <span className="text-[10px] uppercase font-black tracking-widest">Загрузка редактора</span>
                                </div>
                            )}
                        >
                            <RichTextEditor
                                lessonId={lessonId}
                                title={title}
                                onTitleChange={setTitle}
                                content={content}
                                onChange={setContent}
                            />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
};
