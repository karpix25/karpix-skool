import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Loader2
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Label } from '../../components/ui/label';
import { RichTextEditor } from '../../admin/components/editor/RichTextEditor';
import LessonEditorHeader from '../../admin/components/editor/LessonEditorHeader';

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
    const [isVip, setIsVip] = useState(false);
    const [unlockType, setUnlockType] = useState('immediate');
    const [unlockValue, setUnlockValue] = useState('');
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
            setIsVip(l.is_vip || false);
            setUnlockType(l.unlock_type || 'immediate');
            setUnlockValue(l.unlock_value?.toString() || '');
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
                is_published: publish ? true : isPublished,
                is_vip: isVip,
                unlock_type: unlockType,
                unlock_value: unlockValue
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
                isVip={isVip}
                onVipToggle={setIsVip}
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-4xl mx-auto px-6 py-4 space-y-6">
                    {/* Progression Settings Row */}
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/20 rounded-2xl border border-border/50 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-xl border border-border/50">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Unlock Strategy</Label>
                            <select
                                value={unlockType}
                                onChange={(e) => setUnlockType(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-bold focus:ring-0 cursor-pointer"
                            >
                                <option value="immediate">Immediate</option>
                                <option value="level_based">Level Req.</option>
                                <option value="time_relative">Time Delay</option>
                            </select>
                        </div>

                        {unlockType !== 'immediate' && (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                                <span className="material-symbols-outlined text-xs text-muted-foreground/40">arrow_forward</span>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-xl border border-border/50">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                                        {unlockType === 'level_based' ? 'Target Level' : 'Days Post-Join'}
                                    </Label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="bg-transparent border-none text-[11px] font-bold focus:ring-0 w-12 text-center"
                                        value={unlockValue}
                                        onChange={(e) => setUnlockValue(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <RichTextEditor
                        title={title}
                        onTitleChange={setTitle}
                        content={content}
                        onChange={(newContent: string) => {
                            setContent(newContent);
                        }}
                    />
                </div>
            </main>
        </div>
    );
};
