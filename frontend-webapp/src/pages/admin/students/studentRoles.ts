const managementRoles = new Set(['admin', 'owner', 'moderator']);

export const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'Владелец';
    if (role === 'moderator') return 'Модератор';
    if (role === 'admin') return 'Админ';
    return 'Студент';
};

export const isManagementRole = (role: string) => managementRoles.has(role);
