import { describe, expect, it } from 'vitest';

import { readNotebookLmAuthFile } from './notebookLmAuthFile';


describe('readNotebookLmAuthFile', () => {
    it('reads an object-shaped storage state', async () => {
        const file = new File(['{"cookies":[]}'], 'storage_state.json', {
            type: 'application/json',
        });

        await expect(readNotebookLmAuthFile(file)).resolves.toEqual({ cookies: [] });
    });

    it('rejects non-object JSON', async () => {
        const file = new File(['[]'], 'storage_state.json', { type: 'application/json' });

        await expect(readNotebookLmAuthFile(file)).rejects.toThrow('storage_state.json');
    });

    it('returns a localized error for malformed JSON', async () => {
        const file = new File(['not-json'], 'storage_state.json', { type: 'application/json' });

        await expect(readNotebookLmAuthFile(file)).rejects.toThrow('Неверный формат файла');
    });
});
