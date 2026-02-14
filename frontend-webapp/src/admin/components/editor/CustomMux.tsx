import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import CustomMuxPlayer from './MuxPlayer';
import { X } from 'lucide-react';

const MuxNodeView = (props: any) => {
    const { playbackId } = props.node.attrs;

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper className="mux-node-view relative group my-12 w-full max-w-3xl mx-auto h-auto">
            {playbackId ? (
                <div className="relative">
                    <CustomMuxPlayer playbackId={playbackId} />

                    {/* Delete Overlay */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            ) : (
                <div className="aspect-video w-full rounded-[32px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10">
                    <div className="text-center">
                        <div className="animate-pulse text-blue-500 mb-2">Processing video...</div>
                        <div className="text-xs text-slate-400">This may take a minute</div>
                    </div>
                </div>
            )}
        </NodeViewWrapper>
    );
};

export const CustomMux = Node.create({
    name: 'mux',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            playbackId: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-mux-playback-id]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-mux-playback-id': HTMLAttributes.playbackId }, 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MuxNodeView);
    },
});
