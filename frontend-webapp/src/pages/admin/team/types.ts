export type TeamRole = 'owner' | 'admin' | 'student';
export type AssignableTeamRole = 'admin';

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

export const assignableTeamRoles: AssignableTeamRole[] = ['admin'];

export const getTeamRoleLabel = (role: TeamRole | string) => {
    if (role === 'owner') return 'Владелец';
    if (role === 'admin') return 'Админ';
    return 'Студент';
};

export const getTeamRoleDescription = (role: AssignableTeamRole) => {
    if (role === 'admin') return 'Контент и управление школой';
    return '';
};
