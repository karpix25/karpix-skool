import { useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import Youtube from '@tiptap/extension-youtube';
import {
    getLessonMediaAlignClass,
    getLessonMediaWidthClass,
    normalizeLessonMediaAlign,
    normalizeLessonMediaWidth,
} from '../../../lib/lessonMedia';
import { openExternalLink } from '../../../lib/externalLinks';
import { MediaNodeToolbar } from './MediaNodeToolbar';
import { getYoutubeEmbedUrl } from './youtubeEmbed';

const VideoNodeView = (props: NodeViewProps) => {
    const { src, mediaWidth, mediaAlign } = props.node.attrs;
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const embedUrl = getYoutubeEmbedUrl(src);
    const width = normalizeLessonMediaWidth(mediaWidth);
    const align = normalizeLessonMediaAlign(mediaAlign);

    const deleteVideo = () => {
        props.deleteNode();
    };

    return (
        <NodeViewWrapper
            className={`video-node-view group my-12 ${getLessonMediaWidthClass(width)} ${getLessonMediaAlignClass(align)}`}
            data-media-width={width}
            data-media-align={align}
        >
            <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-sm ring-1 ring-border bg-muted">
                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="YouTube video preview"
                    allowFullScreen
                />
                <button
                    type="button"
                    className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    contentEditable={false}
                    aria-label="Открыть настройки видео"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsSettingsOpen(true);
                    }}
                />
            </div>

            <MediaNodeToolbar
                width={width}
                align={align}
                isOpen={isSettingsOpen}
                onWidthChange={(nextWidth) => props.updateAttributes({ mediaWidth: nextWidth })}
                onAlignChange={(nextAlign) => props.updateAttributes({ mediaAlign: nextAlign })}
                onOpen={() => openExternalLink(src)}
                onDelete={deleteVideo}
                onOpenChange={setIsSettingsOpen}
            />
        </NodeViewWrapper>
    );
};

export const CustomYoutube = Youtube.extend({
    addAttributes() {
        const parentAttributes = this.parent?.() ?? {};

        return {
            ...parentAttributes,
            mediaWidth: {
                default: '100%',
                parseHTML: (element: HTMLElement) => normalizeLessonMediaWidth(element.getAttribute('data-media-width')),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-media-width': normalizeLessonMediaWidth(attributes.mediaWidth),
                }),
            },
            mediaAlign: {
                default: 'center',
                parseHTML: (element: HTMLElement) => normalizeLessonMediaAlign(element.getAttribute('data-media-align')),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-media-align': normalizeLessonMediaAlign(attributes.mediaAlign),
                }),
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(VideoNodeView);
    },
});
