export type CourseUnlockType = 'open' | 'level_based' | 'time_relative';

export type ModuleUnlockType = 'immediate' | 'level_based' | 'time_relative';

export interface AdminCourse {
    id: string;
    title: string;
    description?: string | null;
    cover_url?: string | null;
    unlock_type?: CourseUnlockType | string | null;
    unlock_value?: string | number | null;
    open_notebook_id?: string | null;
    is_published: boolean;
    is_vip?: boolean | null;
    lessons_count?: number;
}

export interface CourseFormState {
    title: string;
    description: string;
    cover_url: string;
    unlock_type: CourseUnlockType;
    unlock_value: string;
    is_published: boolean;
    is_vip: boolean;
}

export interface AdminLesson {
    id: string;
    title: string;
    icon?: string | null;
    icon_emoji?: string | null;
    cover_url?: string | null;
    is_published: boolean;
    is_vip?: boolean | null;
    module_id?: string | null;
    order_index?: number | null;
}

export interface AdminModule {
    id: string;
    title: string;
    unlock_type?: ModuleUnlockType | string | null;
    unlock_value?: string | number | null;
    is_vip?: boolean | null;
    lessons: AdminLesson[];
}

export interface ModuleFormState {
    title: string;
    unlock_type: ModuleUnlockType;
    unlock_value: string;
    is_vip: boolean;
}

export interface CourseEditResponse {
    course: AdminCourse;
    modules: AdminModule[];
}

export interface AdminTenant {
    id: string;
    name: string;
    logo_url?: string | null;
    accent_color?: string | null;
    support_url?: string | null;
    setup_code?: string | null;
    setup_code_masked?: boolean;
    free_group_link?: string | null;
    vip_group_link?: string | null;
    telegram_group_id?: string | number | null;
    telegram_group_id_vip?: string | number | null;
    level_names?: Record<string, string> | null;
    welcome_video_enabled?: boolean;
    welcome_video_url?: string | null;
    welcome_video_title?: string | null;
    welcome_video_description?: string | null;
}
