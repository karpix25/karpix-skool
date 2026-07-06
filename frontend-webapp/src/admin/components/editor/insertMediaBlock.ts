import type { Editor } from '@tiptap/core';

type MediaNode = {
    attrs?: Record<string, unknown>;
    type: string;
};

export const insertMediaBlock = (editor: Editor, mediaNode: MediaNode) => (
    editor
        .chain()
        .focus()
        .insertContent([
            mediaNode,
            { type: 'paragraph' },
        ])
        .run()
);
