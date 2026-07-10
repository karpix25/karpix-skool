import type { StudentCourse } from '../../../types/course';

export const withCourseVipAccessFallback = (
    course: StudentCourse,
    fallbackVipGroupLink?: string | null,
): StudentCourse => {
    if (!course.is_vip || course.is_unlocked !== false || course.vip_group_link?.trim()) {
        return course;
    }

    const vipGroupLink = fallbackVipGroupLink?.trim();
    if (!vipGroupLink) return course;

    return {
        ...course,
        vip_group_link: vipGroupLink,
    };
};
