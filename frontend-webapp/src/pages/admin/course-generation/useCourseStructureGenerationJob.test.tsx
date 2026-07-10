import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    fetchCourseStructureGenerationJob,
    startCourseStructureGeneration,
} from './courseStructureGenerationApi';
import { useCourseStructureGenerationJob } from './useCourseStructureGenerationJob';

vi.mock('./courseStructureGenerationApi', () => ({
    fetchCourseStructureGenerationJob: vi.fn(),
    fetchLatestCourseStructureGenerationJob: vi.fn(),
    resumeCourseStructureGenerationJob: vi.fn(),
    startCourseStructureGeneration: vi.fn(),
}));

describe('useCourseStructureGenerationJob', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('refreshes course content whenever another lesson becomes ready', async () => {
        const onCompleted = vi.fn();
        vi.mocked(startCourseStructureGeneration).mockResolvedValue({
            id: 'job-1',
            status: 'running',
            ready_lesson_count: 1,
        });
        vi.mocked(fetchCourseStructureGenerationJob).mockResolvedValue({
            id: 'job-1',
            status: 'running',
            ready_lesson_count: 2,
        });
        const { result } = renderHook(() => useCourseStructureGenerationJob({ onCompleted }));

        await act(async () => {
            await result.current.start('course-1', { sources: [] });
        });
        expect(onCompleted).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
        });
        expect(onCompleted).toHaveBeenCalledTimes(2);
    });
});
