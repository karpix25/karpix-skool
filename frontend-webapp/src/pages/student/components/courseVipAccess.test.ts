import { describe, expect, it } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { withCourseVipAccessFallback } from './courseVipAccess';

const course: StudentCourse = {
    id: 'course-1',
    title: 'Креатор',
    is_vip: true,
    is_unlocked: false,
};

describe('withCourseVipAccessFallback', () => {
    it('uses the tenant VIP group link for locked VIP courses when the course payload has no link', () => {
        expect(withCourseVipAccessFallback(course, ' https://t.me/vip-school ')).toEqual({
            ...course,
            vip_group_link: 'https://t.me/vip-school',
        });
    });

    it('keeps an existing course VIP link stronger than the tenant fallback', () => {
        expect(
            withCourseVipAccessFallback(
                { ...course, vip_group_link: 'https://t.me/course-vip' },
                'https://t.me/tenant-vip',
            ).vip_group_link,
        ).toBe('https://t.me/course-vip');
    });

    it('does not add VIP links to non-VIP or unlocked courses', () => {
        expect(withCourseVipAccessFallback({ ...course, is_vip: false }, 'https://t.me/vip')).not.toHaveProperty('vip_group_link');
        expect(withCourseVipAccessFallback({ ...course, is_unlocked: true }, 'https://t.me/vip')).not.toHaveProperty('vip_group_link');
    });
});
