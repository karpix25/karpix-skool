import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import Youtube from '@tiptap/extension-youtube';
import { X, Link2 } from 'lucide-react';

const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

const VideoNodeView = (props: any) => {
    const { src } = props.node.attrs;
    const embedUrl = getEmbedUrl(src);

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper className="video-node-view relative group my-12 w-full max-w-3xl mx-auto h-auto">
            <div className="relative aspect-video w-full rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-slate-100 dark:bg-slate-800">
                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                />

                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            window.open(src, '_blank');
                        }}
                        className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center text-slate-900 dark:text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                    >
                        <Link2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            deleteVideo();
                        }}
                        className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center text-red-500 shadow-lg hover:scale-110 active:scale-95 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export const CustomYoutube = Youtube.extend({
    addNodeView() {
        return ReactNodeViewRenderer(VideoNodeView);
    },
});
