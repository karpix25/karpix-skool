import { lazy, Suspense, useEffect, useState } from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Loader2 } from 'lucide-react';
import api from '../../../api/client';
import {
    getLessonMediaAlignClass,
    getLessonMediaWidthClass,
    normalizeLessonMediaAlign,
    normalizeLessonMediaWidth,
} from '../../../lib/lessonMedia';
import { MediaNodeToolbar } from './MediaNodeToolbar';

const CustomMuxPlayer = lazy(() => import('./MuxPlayer'));

const MuxNodeView = (props: NodeViewProps) => {
    const { playbackId, lessonId, mediaWidth, mediaAlign } = props.node.attrs;
    const { updateAttributes } = props;
    const [resolvedPlaybackId, setResolvedPlaybackId] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const currentPlaybackId = playbackId || resolvedPlaybackId;
    const width = normalizeLessonMediaWidth(mediaWidth);
    const align = normalizeLessonMediaAlign(mediaAlign);

    useEffect(() => {
        if (playbackId || !lessonId) {
            return;
        }

        let isMounted = true;

        const checkStatus = async () => {
            try {
                const res = await api.get(`/courses/lessons/${lessonId}`);
                const lesson = res.data;
                if (!isMounted) return;

                if (lesson.mux_playback_id) {
                    setResolvedPlaybackId(lesson.mux_playback_id);
                    setStatus('ready');
                    updateAttributes({ playbackId: lesson.mux_playback_id });
                    clearInterval(interval);
                } else {
                    setStatus(lesson.mux_status || 'processing');
                }
            } catch (err) {
                console.error('Failed to fetch mux status:', err);
            }
        };

        const interval = setInterval(checkStatus, 5000);
        checkStatus();

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [playbackId, lessonId, updateAttributes]);

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper
            className={`mux-node-view group my-12 ${getLessonMediaWidthClass(width)} ${getLessonMediaAlignClass(align)}`}
            data-media-width={width}
            data-media-align={align}
        >
            {currentPlaybackId ? (
                <div className="relative">
                    <Suspense fallback={<MuxPlayerSkeleton />}>
                        <CustomMuxPlayer playbackId={currentPlaybackId} />
                    </Suspense>
                </div>
            ) : (
                <div className="aspect-video w-full rounded-lg bg-muted/30 flex flex-col items-center justify-center border border-dashed border-border p-8 text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4 opacity-50" />
                    <div className="space-y-1">
                        <div className="font-bold text-foreground">
                            {status === 'errored' ? 'Upload failed' : 'Processing your video...'}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {status === 'errored'
                                ? 'There was an error processing this video.'
                                : 'Mux is preparing the stream. This happens automatically.'}
                        </p>
                    </div>
                </div>
            )}

            <MediaNodeToolbar
                width={width}
                align={align}
                onWidthChange={(nextWidth) => updateAttributes({ mediaWidth: nextWidth })}
                onAlignChange={(nextAlign) => updateAttributes({ mediaAlign: nextAlign })}
                onDelete={deleteVideo}
            />
        </NodeViewWrapper>
    );
};

const MuxPlayerSkeleton = () => (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-sm ring-1 ring-border bg-muted" />
);

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
            },
            mediaWidth: {
                default: '100%',
            },
            mediaAlign: {
                default: 'center',
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
                    mediaWidth: normalizeLessonMediaWidth((dom as HTMLElement).getAttribute('data-media-width')),
                    mediaAlign: normalizeLessonMediaAlign((dom as HTMLElement).getAttribute('data-media-align')),
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', {
            'data-mux-playback-id': HTMLAttributes.playbackId,
            'data-lesson-id': HTMLAttributes.lessonId,
            'data-media-width': normalizeLessonMediaWidth(HTMLAttributes.mediaWidth),
            'data-media-align': normalizeLessonMediaAlign(HTMLAttributes.mediaAlign),
        }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MuxNodeView);
    },
});
