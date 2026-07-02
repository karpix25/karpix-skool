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
    is_completed?: boolean;
    is_locked?: boolean;
    lock_reason?: string;
}

export interface CourseModule {
    id: string;
    title: string;
    is_locked?: boolean;
    lock_reason?: string;
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
