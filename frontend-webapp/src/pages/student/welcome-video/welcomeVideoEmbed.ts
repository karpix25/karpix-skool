export type WelcomeVideoPlayback =
    | { kind: 'video'; src: string }
    | { kind: 'iframe'; src: string; provider: 'youtube' | 'vimeo' | 'loom' }
    | { kind: 'link'; href: string };

export interface WelcomeVideoVisibilityInput {
    welcome_video_enabled?: boolean;
    welcome_video_url?: string | null;
}

const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'];
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID_PATTERN = /^\d{3,}$/;
const LOOM_ID_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

const parseHttpUrl = (rawUrl: string | null | undefined) => {
    const trimmedUrl = rawUrl?.trim();
    if (!trimmedUrl) return null;

    try {
        const url = new URL(trimmedUrl);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch {
        return null;
    }
};

const withoutWww = (hostname: string) => hostname.replace(/^www\./, '').replace(/^m\./, '');

const withParams = (baseUrl: string, params: Record<string, string>) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
};

const getYoutubeId = (url: URL) => {
    const hostname = withoutWww(url.hostname);

    if (hostname === 'youtu.be') {
        const id = url.pathname.split('/').filter(Boolean)[0];
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (hostname !== 'youtube.com' && hostname !== 'youtube-nocookie.com') return null;

    const watchedId = url.searchParams.get('v');
    if (watchedId && YOUTUBE_ID_PATTERN.test(watchedId)) return watchedId;

    const [section, id] = url.pathname.split('/').filter(Boolean);
    if (['embed', 'v', 'shorts'].includes(section || '') && id && YOUTUBE_ID_PATTERN.test(id)) {
        return id;
    }

    return null;
};

const getVimeoId = (url: URL) => {
    const hostname = withoutWww(url.hostname);
    const parts = url.pathname.split('/').filter(Boolean);

    if (hostname === 'player.vimeo.com' && parts[0] === 'video' && VIMEO_ID_PATTERN.test(parts[1] || '')) {
        return parts[1];
    }

    if (hostname === 'vimeo.com') {
        const id = parts.find((part) => VIMEO_ID_PATTERN.test(part));
        return id || null;
    }

    return null;
};

const getLoomId = (url: URL) => {
    const hostname = withoutWww(url.hostname);
    if (hostname !== 'loom.com') return null;

    const [section, id] = url.pathname.split('/').filter(Boolean);
    if (!['share', 'embed'].includes(section || '') || !id || !LOOM_ID_PATTERN.test(id)) {
        return null;
    }

    return id;
};

const isDirectVideoUrl = (url: URL) => {
    const pathname = url.pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
};

export const getWelcomeVideoEmbed = (rawUrl: string | null | undefined): WelcomeVideoPlayback | null => {
    const url = parseHttpUrl(rawUrl);
    if (!url) return null;

    if (isDirectVideoUrl(url)) {
        return { kind: 'video', src: url.toString() };
    }

    const youtubeId = getYoutubeId(url);
    if (youtubeId) {
        return {
            kind: 'iframe',
            provider: 'youtube',
            src: withParams(`https://www.youtube-nocookie.com/embed/${youtubeId}`, {
                autoplay: '0',
                rel: '0',
            }),
        };
    }

    const vimeoId = getVimeoId(url);
    if (vimeoId) {
        return {
            kind: 'iframe',
            provider: 'vimeo',
            src: withParams(`https://player.vimeo.com/video/${vimeoId}`, { autoplay: '0' }),
        };
    }

    const loomId = getLoomId(url);
    if (loomId) {
        return {
            kind: 'iframe',
            provider: 'loom',
            src: withParams(`https://www.loom.com/embed/${loomId}`, {
                hide_owner: 'true',
                hide_share: 'true',
            }),
        };
    }

    return { kind: 'link', href: url.toString() };
};

export const getWelcomeVideoPlayback = (
    input: WelcomeVideoVisibilityInput | null | undefined
): WelcomeVideoPlayback | null => {
    if (!input?.welcome_video_enabled || !input.welcome_video_url?.trim()) return null;
    return getWelcomeVideoEmbed(input.welcome_video_url);
};
