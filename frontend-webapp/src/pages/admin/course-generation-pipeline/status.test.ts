import { describe, expect, it } from 'vitest';

import {
    createDefaultPublishChecklist,
    createPipelineTimelineSteps,
    getPublishChecklistSummary,
    normalizeCourseGenerationApprovalStatus,
    normalizeCourseGenerationPipelineStatus,
} from './status';

describe('course generation pipeline status helpers', () => {
    it('normalizes backend status aliases', () => {
        expect(normalizeCourseGenerationPipelineStatus('ready_for_review')).toBe('review_required');
        expect(normalizeCourseGenerationPipelineStatus('completed')).toBe('published');
        expect(normalizeCourseGenerationPipelineStatus('unknown', 'idle')).toBe('idle');
    });

    it('normalizes approval aliases', () => {
        expect(normalizeCourseGenerationApprovalStatus('none')).toBe('not_required');
        expect(normalizeCourseGenerationApprovalStatus('changes_requested')).toBe('changes_requested');
        expect(normalizeCourseGenerationApprovalStatus(null)).toBe('not_required');
    });

    it('builds timeline steps from pipeline status', () => {
        const steps = createPipelineTimelineSteps('media_ready');

        expect(steps.map((step) => step.status)).toEqual([
            'completed',
            'completed',
            'completed',
            'completed',
            'active',
            'pending',
        ]);
    });

    it('summarizes required publish checklist items', () => {
        const checklist = createDefaultPublishChecklist().map((item) => (
            item.id === 'student_notifications_ready' ? { ...item, checked: false } : { ...item, checked: true }
        ));

        expect(getPublishChecklistSummary(checklist)).toMatchObject({
            requiredCount: 3,
            completedRequiredCount: 3,
            canPublish: true,
        });
    });
});
