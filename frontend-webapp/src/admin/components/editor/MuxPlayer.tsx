import React, { useEffect, useState } from 'react';

interface MuxPlayerProps {
    playbackId: string;
    metadata?: {
        video_id: string;
        video_title: string;
        viewer_user_id?: string;
    };
    poster?: string;
}

const MUX_PLAYER_SCRIPT_ID = 'mux-player-web-component';
const MUX_PLAYER_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs';

const loadMuxPlayer = () => {
    if (customElements.get('mux-player')) {
        return Promise.resolve();
    }

    const existingScript = document.getElementById(MUX_PLAYER_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
        return new Promise<void>((resolve, reject) => {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Mux player failed to load')), { once: true });
        });
    }

    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = MUX_PLAYER_SCRIPT_ID;
        script.type = 'module';
        script.src = MUX_PLAYER_SCRIPT_SRC;
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('Mux player failed to load')), { once: true });
        document.head.appendChild(script);
    });
};

const CustomMuxPlayer: React.FC<MuxPlayerProps> = ({ playbackId, metadata, poster }) => {
    const [isReady, setIsReady] = useState(customElements.get('mux-player') !== undefined);

    useEffect(() => {
        let mounted = true;
        loadMuxPlayer()
            .then(() => {
                if (mounted) setIsReady(true);
            })
            .catch((error) => {
                console.error(error);
            });

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="relative aspect-video w-full rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-slate-100 dark:bg-slate-800">
            {isReady ? React.createElement('mux-player', {
                'playback-id': playbackId,
                'metadata-video-id': metadata?.video_id,
                'metadata-video-title': metadata?.video_title,
                'metadata-viewer-user-id': metadata?.viewer_user_id,
                'stream-type': 'on-demand',
                class: 'w-full h-full',
                poster,
                'primary-color': '#135bec',
                'accent-color': '#135bec',
            }) : (
                <div className="w-full h-full animate-pulse bg-slate-200 dark:bg-slate-700" />
            )}
        </div>
    );
};

export default CustomMuxPlayer;
