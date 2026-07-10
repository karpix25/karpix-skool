import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import {
    fetchCourseStructureGenerationJob,
    resumeCourseStructureGenerationJob,
} from './courseStructureGenerationApi';

vi.mock('../../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('courseStructureGenerationApi', () => {
    beforeEach(() => vi.clearAllMocks());

    it('normalizes partial lesson progress and derives resumability', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                job_id: 'job-1',
                status: 'partial_drafts',
                planned_lesson_count: 12,
                ready_lesson_count: 9,
                failed_lesson_count: 2,
                source_gap_lesson_count: 1,
                current_stage: 'lessons',
            },
        });

        const job = await fetchCourseStructureGenerationJob('job-1');

        expect(job).toMatchObject({
            id: 'job-1',
            status: 'partial_drafts',
            progress: 75,
            planned_lesson_count: 12,
            ready_lesson_count: 9,
            failed_lesson_count: 2,
            source_gap_lesson_count: 1,
            current_stage: 'lessons',
            can_resume: true,
        });
    });

    it('sends the source-gap choice when resuming a job', async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { id: 'job-1', status: 'queued', can_resume: false },
        });

        await resumeCourseStructureGenerationJob('job-1', true);

        expect(api.post).toHaveBeenCalledWith(
            '/courses/structure-generation-jobs/job-1/resume',
            { include_source_gaps: true },
        );
    });
});
