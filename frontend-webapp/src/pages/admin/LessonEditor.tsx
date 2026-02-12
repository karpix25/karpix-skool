import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Loader2
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RichTextEditor } from '../components/editor/RichTextEditor';

import LessonEditorHeader from '../components/editor/LessonEditorHeader';

export const LessonEditor: React.FC = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { } = useAuth();

    // Extract moduleId from query for new lessons
    const queryParams = new URLSearchParams(location.search);
    const moduleId = queryParams.get('moduleId');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [videoProvider, setVideoProvider] = useState('youtube_unlisted');
    const [videoId, setVideoId] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (lessonId && lessonId !== 'new') {
            fetchLesson();
        } else {
            setIsLoading(false);
            setTitle('');
        }
    }, [lessonId]);

    const fetchLesson = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/webapp/lessons/${lessonId}`);
            const l = res.data.lesson;
            setTitle(l.title);
            setContent(l.content || '');
            setVideoProvider(l.video_provider || 'youtube_unlisted');
            setVideoId(l.video_id || '');
            setIsPublished(l.is_published);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (publish = false) => {
        try {
            setIsSaving(true);
            const payload = {
                title: title || 'Untitled Lesson',
                content,
                video_provider: videoProvider,
                video_id: videoId,
                is_published: publish ? true : isPublished
            };

            if (lessonId && lessonId !== 'new') {
                await api.patch(`/courses/lessons/${lessonId}`, payload);
            } else if (moduleId) {
                await api.post(`/courses/modules/${moduleId}/lessons`, payload);
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
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Preparing Editor</span>
        </div>
    );

    return (
        <div className="bg-[#fafafa] dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col animate-in fade-in duration-700">
            <LessonEditorHeader
                title={title}
                courseId={courseId!}
                onPublish={() => handleSave(true)}
                onPreview={() => window.open(`/lesson/${lessonId}`, '_blank')}
                isSaving={isSaving}
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <RichTextEditor
                    title={title}
                    onTitleChange={setTitle}
                    content={content}
                    onChange={(newContent: string) => {
                        setContent(newContent);
                        // Auto-save logic could go here
                    }}
                />
            </main>
        </div>
    );
};
