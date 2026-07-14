import type { LucideIcon } from 'lucide-react';

export type OnboardingTaskState = 'completed' | 'available' | 'locked' | 'guidance';

export interface OnboardingTask {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    path?: string;
    state: OnboardingTaskState;
    required: boolean;
}

export interface OnboardingProgressSnapshot {
    hasSchoolProfile: boolean;
    hasServingSubscription: boolean;
    coursesCount: number;
    publishedCourseId: string | null;
    studentsCount: number;
    hasStudentPreview: boolean;
    isCompleted: boolean;
}
