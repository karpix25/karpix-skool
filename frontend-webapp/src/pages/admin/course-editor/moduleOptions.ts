import type { AdminModule, ModuleUnlockType } from '../../../types/admin';

export const moduleUnlockOptions: Array<{ id: ModuleUnlockType; label: string }> = [
    { id: 'immediate', label: 'Сразу' },
    { id: 'level_based', label: 'Уровень' },
    { id: 'time_relative', label: 'Время' },
];

export const createEmptyModuleForm = () => ({
    title: '',
    unlock_type: 'immediate' as ModuleUnlockType,
    unlock_value: '1',
    is_vip: false,
});

export const toModuleUnlockType = (unlockType: AdminModule['unlock_type']): ModuleUnlockType => {
    return unlockType === 'level_based' || unlockType === 'time_relative' ? unlockType : 'immediate';
};
