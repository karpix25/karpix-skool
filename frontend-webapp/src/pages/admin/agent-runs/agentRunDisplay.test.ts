import { describe, expect, it } from 'vitest';

import {
    countArtifacts,
    getCourseArtifact,
    getCourseTitle,
    getMediaUrl,
    getSourceJobArtifact,
} from './agentRunDisplay';
import type { AgentRun } from './types';

const baseRun: AgentRun = {
    id: 'run-1',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-1',
    task_type: 'create_course_draft',
    status: 'draft_created',
    approval_status: 'pending',
    input_json: { course_title: 'Payload title' },
    error: null,
    created_at: '2026-07-07T00:00:00.000Z',
    updated_at: '2026-07-07T00:00:00.000Z',
    completed_at: null,
    steps: [],
    approvals: [],
    artifacts: [
        {
            id: 'artifact-course',
            artifact_type: 'course',
            resource_type: 'course',
            resource_id: 'course-1',
            title: 'Artifact title',
            payload_json: null,
            created_at: '2026-07-07T00:00:00.000Z',
        },
        {
            id: 'artifact-media',
            artifact_type: 'media',
            resource_type: 'course_cover',
            resource_id: 'course-1',
            title: 'Cover',
            payload_json: { url: 'https://cdn.example.com/cover.png' },
            created_at: '2026-07-07T00:00:00.000Z',
        },
        {
            id: 'artifact-job',
            artifact_type: 'course_structure_generation_job',
            resource_type: 'course_structure_generation_job',
            resource_id: 'job-1',
            title: 'Open Notebook',
            payload_json: null,
            created_at: '2026-07-07T00:00:00.000Z',
        },
    ],
};

describe('agentRunDisplay', () => {
    it('extracts the primary course artifact and title', () => {
        expect(getCourseArtifact(baseRun)?.resource_id).toBe('course-1');
        expect(getCourseTitle(baseRun)).toBe('Artifact title');
    });

    it('falls back to the input title when no course artifact title exists', () => {
        expect(getCourseTitle({ ...baseRun, artifacts: [] })).toBe('Payload title');
    });

    it('counts artifacts and extracts media urls', () => {
        expect(countArtifacts(baseRun, 'media')).toBe(1);
        expect(getMediaUrl(baseRun.artifacts[1])).toBe('https://cdn.example.com/cover.png');
        expect(getSourceJobArtifact(baseRun)?.resource_id).toBe('job-1');
    });
});
