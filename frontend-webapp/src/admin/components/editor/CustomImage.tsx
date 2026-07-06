import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

import {
    getLessonMediaAlignClass,
    getLessonMediaWidthClass,
    normalizeLessonMediaAlign,
    normalizeLessonMediaWidth,
} from '../../../lib/lessonMedia';
import { MediaNodeToolbar } from './MediaNodeToolbar';

const ImageNodeView = (props: NodeViewProps) => {
    const { src, alt, title, mediaWidth, mediaAlign } = props.node.attrs;
    const width = normalizeLessonMediaWidth(mediaWidth);
    const align = normalizeLessonMediaAlign(mediaAlign);

    return (
        <NodeViewWrapper
            as="figure"
            className="image-node-view group my-10 w-full max-w-full"
            data-media-width={width}
            data-media-align={align}
        >
            <div className={`${getLessonMediaWidthClass(width)} ${getLessonMediaAlignClass(align)}`}>
                <img
                    src={src}
                    alt={alt || ''}
                    title={title || undefined}
                    className="block h-auto w-full rounded-lg border border-border shadow-sm"
                    draggable={false}
                    data-media-width={width}
                    data-media-align={align}
                />
            </div>

            <MediaNodeToolbar
                width={width}
                align={align}
                onWidthChange={(nextWidth) => props.updateAttributes({ mediaWidth: nextWidth })}
                onAlignChange={(nextAlign) => props.updateAttributes({ mediaAlign: nextAlign })}
                onDelete={() => props.deleteNode()}
            />
        </NodeViewWrapper>
    );
};

export const CustomImage = Image.extend({
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
        return ReactNodeViewRenderer(ImageNodeView);
    },
});
