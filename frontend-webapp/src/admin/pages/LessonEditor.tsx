import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Video,
    ImageIcon,
    ChevronDown,
    X,
    ArrowLeft,
    Search,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { RichTextEditor } from '../components/editor/RichTextEditor';
import api from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

export const LessonEditor: React.FC = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

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
        <div className="bg-[#F9FAFB] min-h-screen flex flex-col animate-in fade-in duration-500">
            {/* Top Navigation Header */}
            <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/courses/${courseId}`)}
                        className="p-2 -ml-2 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-pink-500 text-white border-none">
                            <AvatarFallback className="bg-pink-500 text-white font-bold text-xs">
                                {user?.name?.charAt(0).toUpperCase() || 'K'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm text-foreground">
                            {user?.name || 'Karl'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                    <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                        <Search size={20} />
                    </button>
                    <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-2xl mx-auto bg-white shadow-sm pb-[320px]">
                <RichTextEditor
                    title={title}
                    onTitleChange={setTitle}
                    content={content}
                    onChange={setContent}
                />
            </div>

            {/* Bottom Controls - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-border/40 z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <div className="max-w-2xl w-full mx-auto px-6 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-[44px] px-6 rounded-xl font-black uppercase tracking-widest text-[10px] flex gap-2 border-border/60 hover:bg-muted/50 transition-all bg-white shadow-sm">
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
                                <Badge variant="secondary" className="h-[44px] px-4 rounded-full flex gap-3 bg-primary/5 text-primary border-primary/10 overflow-hidden max-w-[200px]">
                                    <Video size={14} className="shrink-0" />
                                    <span className="truncate text-[9px] font-black uppercase tracking-wider">Video: {videoId}</span>
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
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Draft</span>
                            <Switch
                                checked={!isPublished}
                                onCheckedChange={(checked) => setIsPublished(!checked)}
                                className="data-[state=checked]:bg-muted-foreground/20 scale-90"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title}
                            className="w-full h-[52px] bg-[#F5D485] hover:bg-[#F2C966] text-black font-black uppercase tracking-[0.2em] text-[12px] rounded-xl shadow-lg border-none transition-all active:scale-[0.98]"
                        >
                            {isSaving ? '...' : 'SAVE'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/courses/${courseId}`)}
                            className="w-full h-[52px] bg-white hover:bg-muted text-foreground font-black uppercase tracking-[0.2em] text-[12px] rounded-xl border-border/60 transition-all active:scale-[0.98] shadow-sm"
                        >
                            CANCEL
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
