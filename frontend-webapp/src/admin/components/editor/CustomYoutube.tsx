import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import Youtube from '@tiptap/extension-youtube';
import { X, Link2 } from 'lucide-react';
import { openExternalLink } from '../../../lib/externalLinks';

const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

const VideoNodeView = (props: NodeViewProps) => {
    const { src } = props.node.attrs;
    const embedUrl = getEmbedUrl(src);

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper className="video-node-view relative group my-12 w-full max-w-3xl mx-auto h-auto">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-sm ring-1 ring-border bg-muted">
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
                            openExternalLink(src);
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-sm transition-all active:scale-[0.99]"
                    >
                        <Link2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            deleteVideo();
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card/95 text-destructive shadow-sm transition-all active:scale-[0.99]"
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
