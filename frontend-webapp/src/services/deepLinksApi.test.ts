import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../api/client';
import { getCourseShareLink } from './deepLinks';

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

const courseId = '22222222-2222-4222-8222-222222222222';
const apiGet = vi.mocked(api.get);
const apiResponse = (data: unknown) => ({ data }) as Awaited<ReturnType<typeof api.get>>;

describe('deep link share API', () => {
    beforeEach(() => {
        apiGet.mockReset();
    });

    it('loads and normalizes course share links', async () => {
        apiGet.mockResolvedValue(apiResponse({
            url: ` https://t.me/karpix_shkola_bot?start=course_${courseId} `,
            start_param: `course_${courseId}`,
        }));

        await expect(getCourseShareLink(courseId)).resolves.toEqual({
            url: `https://t.me/karpix_shkola_bot?start=course_${courseId}`,
            start_param: `course_${courseId}`,
        });
        expect(apiGet).toHaveBeenCalledWith(`/courses/${courseId}/share-link`);
    });

    it('rejects empty course share URLs', async () => {
        apiGet.mockResolvedValue(apiResponse({
            url: ' ',
            start_param: `course_${courseId}`,
        }));

        await expect(getCourseShareLink(courseId)).rejects.toThrow('Share link response does not include a URL');
    });
});
