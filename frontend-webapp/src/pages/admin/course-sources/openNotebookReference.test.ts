import { describe, expect, it } from 'vitest';

import {
    buildOpenNotebookUrl,
    extractOpenNotebookId,
    isOpenNotebookReference,
} from './openNotebookReference';

describe('open notebook references', () => {
    it('extracts notebook ids from encoded links and raw ids', () => {
        expect(extractOpenNotebookId('notebook:abc')).toBe('notebook:abc');
        expect(
            extractOpenNotebookId('https://notebook.karpix.com/notebooks/notebook%3Aabc')
        ).toBe('notebook:abc');
    });

    it('builds canonical notebook urls only for notebook references', () => {
        expect(buildOpenNotebookUrl('notebook:abc')).toBe(
            'https://notebook.karpix.com/notebooks/notebook%3Aabc'
        );
        expect(isOpenNotebookReference('https://example.com/material')).toBe(false);
        expect(buildOpenNotebookUrl('https://example.com/material')).toBeNull();
    });
});
