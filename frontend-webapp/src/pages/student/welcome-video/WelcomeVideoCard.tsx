import React from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { externalLinkRel } from '../../../lib/externalLinks';
import type { TenantInfo } from '../../../types/auth';
import { getWelcomeVideoPlayback } from './welcomeVideoEmbed';

interface WelcomeVideoCardProps {
    tenant: TenantInfo | null;
}

const getWelcomeVideoTitle = (tenant: TenantInfo) => {
    const customTitle = tenant.welcome_video_title?.trim();
    if (customTitle) return customTitle;

    return tenant.name ? `Добро пожаловать в ${tenant.name}` : 'Добро пожаловать в школу';
};

export const WelcomeVideoCard: React.FC<WelcomeVideoCardProps> = ({ tenant }) => {
    const playback = getWelcomeVideoPlayback(tenant);
    if (!tenant || !playback) return null;

    const description = tenant.welcome_video_description?.trim();
    const title = getWelcomeVideoTitle(tenant);

    return (
        <section aria-label="Приветственное видео" className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="space-y-3 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <PlayCircle size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-muted-foreground">Сообщение от школы</p>
                            <h2 className="mt-1 text-lg font-semibold leading-tight text-foreground">{title}</h2>
                            {description && (
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {playback.kind === 'video' && (
                    <div className="border-t border-border/70 bg-black">
                        <video
                            className="aspect-video w-full bg-black"
                            src={playback.src}
                            controls
                            playsInline
                            preload="metadata"
                        />
                    </div>
                )}

                {playback.kind === 'iframe' && (
                    <div className="border-t border-border/70 bg-black">
                        <iframe
                            className="aspect-video w-full"
                            src={playback.src}
                            title={title}
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                )}

                {playback.kind === 'link' && (
                    <div className="border-t border-border/70 bg-muted/20 p-4 sm:p-5">
                        <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
                            <a href={playback.href} target="_blank" rel={externalLinkRel}>
                                <ExternalLink size={17} />
                                Открыть видео
                            </a>
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
};
