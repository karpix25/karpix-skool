export type TeamRole = 'owner' | 'admin' | 'moderator' | 'student';
export type AssignableTeamRole = 'admin' | 'moderator';

export interface TeamMember {
    id: string;
    user_id: string;
    username: string | null;
    telegram_id: number | string | null;
    avatar_url: string | null;
    role: TeamRole;
    status: 'active' | 'paused' | string;
    joined_at: string;
    xp: number;
    level: number;
}

export const assignableTeamRoles: AssignableTeamRole[] = ['admin', 'moderator'];

export const getTeamRoleLabel = (role: TeamRole | string) => {
    if (role === 'owner') return 'Владелец';
    if (role === 'admin') return 'Админ';
    if (role === 'moderator') return 'Модератор';
    return 'Студент';
};

export const getTeamRoleDescription = (role: AssignableTeamRole) => {
    if (role === 'admin') return 'Контент и управление школой';
    return 'Операционная помощь в школе';
};
