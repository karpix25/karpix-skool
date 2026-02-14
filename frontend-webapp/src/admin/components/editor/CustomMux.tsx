import { useEffect, useState } from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import CustomMuxPlayer from './MuxPlayer';
import { X, Loader2 } from 'lucide-react';
import api from '../../../api/client';

const MuxNodeView = (props: any) => {
    const { playbackId, lessonId } = props.node.attrs;
    const [currentPlaybackId, setCurrentPlaybackId] = useState(playbackId);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        // If we already have a playbackId, we're good
        if (playbackId) {
            setCurrentPlaybackId(playbackId);
            return;
        }

        // If no playbackId but we have a lessonId, try to fetch it
        if (!playbackId && lessonId) {
            let interval: any;

            const checkStatus = async () => {
                try {
                    const res = await api.get(`/courses/lessons/${lessonId}`);
                    const lesson = res.data;
                    if (lesson.mux_playback_id) {
                        setCurrentPlaybackId(lesson.mux_playback_id);
                        setStatus('ready');

                        // Update the node attributes so it persists with the ID next time
                        props.updateAttributes({
                            playbackId: lesson.mux_playback_id
                        });

                        clearInterval(interval);
                    } else {
                        setStatus(lesson.mux_status || 'processing');
                    }
                } catch (err) {
                    console.error('Failed to fetch mux status:', err);
                }
            };

            checkStatus();
            interval = setInterval(checkStatus, 5000); // Poll every 5 seconds

            return () => clearInterval(interval);
        }
    }, [playbackId, lessonId]);

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper className="mux-node-view relative group my-12 w-full max-w-3xl mx-auto h-auto">
            {currentPlaybackId ? (
                <div className="relative">
                    <CustomMuxPlayer playbackId={currentPlaybackId} />

                    {/* Delete Overlay */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
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
                <div className="aspect-video w-full rounded-[32px] bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4 opacity-50" />
                    <div className="space-y-1">
                        <div className="font-bold text-slate-600 dark:text-slate-300">
                            {status === 'errored' ? 'Upload failed' : 'Processing your video...'}
                        </div>
                        <p className="text-sm text-slate-400">
                            {status === 'errored'
                                ? 'There was an error processing this video.'
                                : 'Mux is preparing the stream. This happens automatically.'}
                        </p>
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
            lessonId: {
                default: '',
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-mux-playback-id]',
                getAttrs: (dom) => ({
                    playbackId: (dom as HTMLElement).getAttribute('data-mux-playback-id') || '',
                    lessonId: (dom as HTMLElement).getAttribute('data-lesson-id') || '',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', {
            'data-mux-playback-id': HTMLAttributes.playbackId,
            'data-lesson-id': HTMLAttributes.lessonId
        }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MuxNodeView);
    },
});
