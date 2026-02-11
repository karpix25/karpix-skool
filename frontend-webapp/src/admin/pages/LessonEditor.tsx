import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Video,
    ImageIcon,
    ChevronDown,
    X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { RichTextEditor } from '../components/RichTextEditor';
import api from '../../api/client';
import { Badge } from '../../components/ui/badge';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (lessonId && lessonId !== 'new') {
            fetchLesson();
        } else {
            setIsLoading(false);
            setTitle('New page');
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

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const payload = {
                title,
                content,
                video_provider: videoProvider,
                video_id: videoId,
                is_published: isPublished
            };

            if (lessonId && lessonId !== 'new') {
                await api.patch(`/courses/lessons/${lessonId}`, payload);
            } else if (moduleId) {
                await api.post(`/courses/modules/${moduleId}/lessons`, payload);
            }
            navigate(`/courses/${courseId}`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-white flex flex-col animate-in fade-in duration-500">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* RichTextEditor already has the toolbar at the top */}
                <div className="w-full">
                    <RichTextEditor
                        content={content}
                        onChange={setContent}
                    />
                </div>

                {/* Content Section */}
                <div className="max-w-4xl w-full mx-auto px-6 py-10 space-y-10">
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Название страницы"
                            className="w-full text-4xl font-black bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/20 text-foreground tracking-tight"
                        />
                    </div>

                    {/* Editor area is part of RichTextEditor above */}
                </div>
            </div>

            {/* Bottom Controls - They push down as content grows */}
            <div className="max-w-4xl w-full mx-auto px-6 pb-32 space-y-10">
                <div className="flex items-center justify-between border-t border-border/50 pt-10">
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-[52px] px-8 rounded-xl font-black uppercase tracking-widest text-[11px] flex gap-2 border-border/60 hover:bg-muted/50 transition-all">
                                    ADD <ChevronDown size={14} className="opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl border-border/60 shadow-xl">
                                <DropdownMenuItem
                                    className="rounded-lg h-10 flex gap-3 font-bold text-xs"
                                    onClick={() => {
                                        const id = window.prompt('YouTube Video ID');
                                        if (id) setVideoId(id);
                                    }}
                                >
                                    <Video size={16} className="text-muted-foreground" /> YouTube Video
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg h-10 flex gap-3 font-bold text-xs">
                                    <ImageIcon size={16} className="text-muted-foreground" /> Image
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {videoId && (
                            <Badge variant="secondary" className="h-10 px-4 rounded-full flex gap-3 bg-primary/5 text-primary border-primary/10 overflow-hidden max-w-[240px]">
                                <Video size={14} className="shrink-0" />
                                <span className="truncate text-[10px] font-black uppercase tracking-wider">Video: {videoId}</span>
                                <button
                                    onClick={() => setVideoId('')}
                                    className="hover:bg-primary/10 p-1 rounded-full transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Draft</span>
                        <Switch
                            checked={!isPublished}
                            onCheckedChange={(checked) => setIsPublished(!checked)}
                            className="data-[state=checked]:bg-muted-foreground/20"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !title}
                        className="w-full h-[64px] bg-[#F5D485] hover:bg-[#F2C966] text-black font-black uppercase tracking-[0.25em] text-[13px] rounded-xl shadow-lg border-none transition-all active:scale-[0.98]"
                    >
                        {isSaving ? 'Сохранение...' : 'SAVE'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/courses/${courseId}`)}
                        className="w-full h-[64px] bg-white hover:bg-muted text-foreground font-black uppercase tracking-[0.25em] text-[13px] rounded-xl border-border/60 transition-all active:scale-[0.98]"
                    >
                        CANCEL
                    </Button>
                </div>
            </div>
        </div>
    );
};
