export interface StudentCourse {
    id: string;
    title: string;
    description?: string;
    cover_url?: string;
    progress_percent?: number;
    is_vip?: boolean;
    is_unlocked?: boolean;
    lock_reason?: string;
    vip_group_link?: string;
}

export interface CourseLessonSummary {
    id: string;
    title: string;
    icon_emoji?: string | null;
    is_completed?: boolean;
    is_locked?: boolean;
    lock_reason?: string;
}

export interface CourseModule {
    id: string;
    title: string;
    is_locked?: boolean;
    lock_reason?: string;
    total_lessons?: number;
    completed_lessons?: number;
    progress_percent?: number;
    lessons: CourseLessonSummary[];
}

export interface CourseDetailData {
    course: StudentCourse;
    progress_percent: number;
    modules: CourseModule[];
}

export interface LessonContent {
    id: string;
    title: string;
    content?: string;
    cover_url?: string | null;
    icon_emoji?: string | null;
    video_id?: string;
    video_provider?: string;
    mux_playback_id?: string | null;
    mux_status?: string | null;
}

export interface LessonDetailData {
    lesson: LessonContent;
    course_id: string;
    is_locked?: boolean;
    lock_reason?: string;
    is_completed?: boolean;
    next_lesson_id?: string | null;
}

export interface LessonCountProgress {
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
}

export interface ModuleProgressSnapshot extends LessonCountProgress {
    module_id: string;
    title: string;
}

export interface CourseProgressSnapshot extends LessonCountProgress {
    course_id: string;
}

export interface LessonCompletionResponse {
    xp_granted: number;
    new_xp: number;
    new_level: number;
    module_progress: ModuleProgressSnapshot;
    course_progress: CourseProgressSnapshot;
}
