export type LevelUnlockTargetType = 'course' | 'module' | 'lesson';

export type XpSourceType = 'lesson' | 'message' | 'reaction';

export interface WebAppLevelUnlock {
    target_type: LevelUnlockTargetType;
    tenant_id: string;
    course_id: string;
    module_id?: string | null;
    lesson_id?: string | null;
    title: string;
    course_title?: string | null;
    module_title?: string | null;
    required_level: number;
    xp_threshold: number;
    is_vip: boolean;
    order_index: number;
}

export interface WebAppLevelMilestone {
    level: number;
    xp_threshold: number;
    unlocks: WebAppLevelUnlock[];
}

export interface WebAppLevelMembership {
    tenant_id: string;
    xp: number;
    level: number;
}

export interface WebAppXpSource {
    source_type: XpSourceType;
    title: string;
    description: string;
    points: number;
    limit?: string | null;
}

export interface WebAppLevelsResponse {
    milestones: WebAppLevelMilestone[];
    memberships: WebAppLevelMembership[];
    xp_sources: WebAppXpSource[];
}
