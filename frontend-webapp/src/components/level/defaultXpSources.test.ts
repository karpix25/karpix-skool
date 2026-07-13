import { describe, expect, it } from 'vitest';

import { DEFAULT_XP_SOURCES } from './defaultXpSources';

describe('DEFAULT_XP_SOURCES', () => {
    it('explains the one-time reward for a newly correct quiz answer', () => {
        expect(DEFAULT_XP_SOURCES).toContainEqual({
            source_type: 'quiz_question',
            title: 'Правильный ответ в тесте',
            description: 'Начисляется один раз за каждый вопрос, когда вы впервые ответили на него правильно.',
            points: 2,
        });
    });
});
