import React, { lazy, Suspense } from 'react';
import { AlertCircle, Clock3, Loader2 } from 'lucide-react';
import type { LessonContent } from '../../../types/course';

const CustomMuxPlayer = lazy(() => import('../../../admin/components/editor/MuxPlayer'));

interface LessonVideoPlayerProps {
    lesson: LessonContent;
}

type VideoStateTone = 'muted' | 'loading' | 'error';

interface VideoStateContent {
    title: string;
    description: string;
    tone: VideoStateTone;
}

const failedMuxStatuses = new Set(['error', 'errored', 'failed', 'failure']);

const getMuxState = (status?: string | null): VideoStateContent => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus && failedMuxStatuses.has(normalizedStatus)) {
        return {
            title: 'Видео не загрузилось',
            description: 'Файл не удалось обработать. Сообщите администратору курса.',
            tone: 'error',
        };
    }

    if (normalizedStatus === 'ready') {
        return {
            title: 'Видео почти готово',
            description: 'Ссылка для воспроизведения еще не появилась. Попробуйте обновить урок позже.',
            tone: 'muted',
        };
    }

    if (normalizedStatus) {
        return {
            title: 'Видео обрабатывается',
            description: 'Плеер появится автоматически, когда видео будет готово.',
            tone: 'loading',
        };
    }

    return {
        title: 'Видео пока не готово',
        description: 'Мы еще не получили ссылку для воспроизведения. Попробуйте обновить урок позже.',
        tone: 'muted',
    };
};

const VideoState: React.FC<VideoStateContent> = ({ title, description, tone }) => {
    const Icon = tone === 'error' ? AlertCircle : tone === 'loading' ? Loader2 : Clock3;

    return (
        <div className="w-full aspect-video bg-muted text-center px-6 flex flex-col items-center justify-center gap-3">
            <Icon
                size={30}
                className={tone === 'error' ? 'text-destructive' : tone === 'loading' ? 'text-primary animate-spin' : 'text-muted-foreground'}
            />
            <div className="space-y-1 max-w-sm">
                <p className="font-bold text-sm text-foreground">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

const MuxPlayerFallback = () => (
    <div className="w-full aspect-video bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white/70" size={28} />
    </div>
);

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({ lesson }) => {
    const provider = lesson.video_provider;

    if (provider === 'mux') {
        if (lesson.mux_playback_id) {
            return (
                <Suspense fallback={<MuxPlayerFallback />}>
                    <CustomMuxPlayer
                        playbackId={lesson.mux_playback_id}
                        metadata={{
                            video_id: lesson.id,
                            video_title: lesson.title,
                        }}
                    />
                </Suspense>
            );
        }

        return <VideoState {...getMuxState(lesson.mux_status)} />;
    }

    if (provider === 'youtube_unlisted' && lesson.video_id) {
        return (
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black">
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${lesson.video_id}`}
                    title={lesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        );
    }

    if (provider && lesson.video_id) {
        return (
            <VideoState
                title="Видео недоступно"
                description="Этот формат видео пока нельзя открыть в уроке."
                tone="muted"
            />
        );
    }

    return null;
};
