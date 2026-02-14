import React from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface MuxPlayerProps {
    playbackId: string;
    metadata?: {
        video_id: string;
        video_title: string;
        viewer_user_id?: string;
    };
    poster?: string;
}

const CustomMuxPlayer: React.FC<MuxPlayerProps> = ({ playbackId, metadata, poster }) => {
    return (
        <div className="relative aspect-video w-full rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-slate-100 dark:bg-slate-800">
            <MuxPlayer
                playbackId={playbackId}
                metadata={metadata}
                streamType="on-demand"
                className="w-full h-full"
                poster={poster}
                primaryColor="#135bec"
                accentColor="#135bec"
            />
        </div>
    );
};

export default CustomMuxPlayer;
