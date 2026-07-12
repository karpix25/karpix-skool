import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, EyeOff, PlayCircle } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { externalLinkRel } from '../../../lib/externalLinks';
import { cn } from '../../../lib/utils';
import type { TenantInfo } from '../../../types/auth';
import { getWelcomeVideoPlayback, type WelcomeVideoPlayback } from './welcomeVideoEmbed';

interface WelcomeVideoCardProps {
    tenant: TenantInfo | null;
}

const getWelcomeVideoTitle = (tenant: TenantInfo) => {
    const customTitle = tenant.welcome_video_title?.trim();
    if (customTitle) return customTitle;

    return tenant.name ? `Добро пожаловать в ${tenant.name}` : 'Добро пожаловать в школу';
};

const getVisibilityKey = (tenant: TenantInfo, videoUrl: string | null | undefined) => (
    `karpix-welcome-video-hidden:${tenant.id}:${videoUrl || 'empty'}`
);

const readSessionHidden = (key: string) => {
    try {
        return window.sessionStorage.getItem(key) === '1';
    } catch {
        return false;
    }
};

const writeSessionHidden = (key: string) => {
    try {
        window.sessionStorage.setItem(key, '1');
    } catch {
        // Non-critical: the hide control still works for the current render.
    }
};

const WelcomeVideoSurface = ({
    playback,
    title,
}: {
    playback: WelcomeVideoPlayback;
    title: string;
}) => {
    if (playback.kind === 'video') {
        return (
            <video
                className="aspect-video w-full bg-black"
                src={playback.src}
                controls
                playsInline
                preload="metadata"
            />
        );
    }

    if (playback.kind === 'iframe') {
        return (
            <iframe
                className="aspect-video w-full"
                src={playback.src}
                title={title}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        );
    }

    return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ExternalLink size={24} />
            </div>
            <Button asChild variant="outline" className="h-11 rounded-lg">
                <a href={playback.href} target="_blank" rel={externalLinkRel}>
                    Открыть видео
                </a>
            </Button>
        </div>
    );
};

export const WelcomeVideoCard: React.FC<WelcomeVideoCardProps> = ({ tenant }) => {
    const playback = getWelcomeVideoPlayback(tenant);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    const visibilityKey = useMemo(
        () => tenant && playback ? getVisibilityKey(tenant, tenant.welcome_video_url) : null,
        [tenant, playback],
    );

    useEffect(() => {
        if (!visibilityKey) return;
        setIsHidden(readSessionHidden(visibilityKey));
        setIsCollapsed(false);
    }, [visibilityKey]);

    if (!tenant || !playback || isHidden) return null;

    const description = tenant.welcome_video_description?.trim();
    const title = getWelcomeVideoTitle(tenant);

    const hideVideo = () => {
        if (visibilityKey) writeSessionHidden(visibilityKey);
        setIsHidden(true);
    };

    if (isCollapsed) {
        return (
            <section aria-label="Приветственное видео" className="overflow-x-clip">
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <PlayCircle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Видео от школы
                        </p>
                        <h2 className="truncate text-sm font-semibold leading-5 text-foreground">{title}</h2>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 rounded-lg px-3 text-xs"
                        onClick={() => setIsCollapsed(false)}
                    >
                        Смотреть
                        <ChevronDown size={15} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-lg text-muted-foreground"
                        onClick={hideVideo}
                        aria-label="Скрыть приветственное видео"
                        title="Скрыть"
                    >
                        <EyeOff size={16} />
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section aria-label="Приветственное видео" className="overflow-x-clip">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="min-w-0 bg-black">
                        <WelcomeVideoSurface playback={playback} title={title} />
                    </div>

                    <div className="flex min-w-0 flex-col border-t border-border/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                                    Старт здесь
                                </p>
                                <h2 className="mt-1 line-clamp-3 text-balance break-words text-lg font-semibold leading-[1.15] text-foreground lg:text-xl">
                                    {title}
                                </h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 min-h-9 min-w-9 shrink-0 rounded-lg text-muted-foreground"
                                onClick={hideVideo}
                                aria-label="Скрыть приветственное видео"
                                title="Скрыть"
                            >
                                <EyeOff size={16} />
                            </Button>
                        </div>

                        {description && (
                            <p className="max-h-28 overflow-y-auto break-words pr-1 text-sm leading-6 text-muted-foreground">
                                {description}
                            </p>
                        )}

                        <div
                            className={cn(
                                'mt-5 flex items-center gap-2',
                                description ? 'border-t border-border/70 pt-4' : 'pt-1',
                            )}
                        >
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-lg px-3 text-xs"
                                onClick={() => setIsCollapsed(true)}
                            >
                                <ChevronUp size={15} />
                                Свернуть
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg px-3 text-xs"
                                onClick={hideVideo}
                            >
                                Скрыть
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
