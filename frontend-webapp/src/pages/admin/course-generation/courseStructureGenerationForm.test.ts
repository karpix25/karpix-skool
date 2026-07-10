import { describe, expect, it } from 'vitest';

import {
    createDefaultCourseStructureGenerationForm,
    toCourseStructureGenerationInput,
} from './courseStructureGenerationForm';

describe('course structure generation form', () => {
    it('serializes methodology fields into the API payload', () => {
        const form = {
            ...createDefaultCourseStructureGenerationForm(),
            targetAudience: ' Основатели ',
            pointA: ' Нет процесса ',
            pointB: ' Есть AI-агент ',
            globalBenefit: ' Меньше ручной работы ',
            authorExperience: ' Автор внедрял похожий процесс ',
        };

        expect(toCourseStructureGenerationInput(form)).toMatchObject({
            target_audience: 'Основатели',
            point_a: 'Нет процесса',
            point_b: 'Есть AI-агент',
            global_benefit: 'Меньше ручной работы',
            author_experience: 'Автор внедрял похожий процесс',
        });
    });
});
