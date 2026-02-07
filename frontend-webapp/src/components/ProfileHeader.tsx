import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Cell, Section, Button, Text } from '@telegram-apps/telegram-ui';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export const ProfileHeader: React.FC = () => {
    const { user, membership, logout, isAdmin, setViewMode } = useAuth();
    if (!user || !membership) return null;

    const currentXp = membership.xp;
    const level = membership.level;
    const xpForNextLevel = level * 50;
    const prevLevelXp = (level - 1) * 50;
    const progressInLevel = currentXp - prevLevelXp;
    const progressPercent = Math.min(Math.max((progressInLevel / 50) * 100, 0), 100);

    return (
        <Section>
            <Cell
                before={
                    <Avatar
                        size={48}
                        src={user.avatar_url}
                        fallbackIcon={<span>{user.username?.[0]?.toUpperCase() || 'U'}</span>}
                        style={{ backgroundColor: '#2481cc' }}
                    />
                }
                description={`ID: ${user.telegram_id}`}
                after={
                    <div onClick={() => { if (confirm('Выйти?')) logout(); }} style={{ cursor: 'pointer', opacity: 0.5 }}>
                        <LogOut size={20} />
                    </div>
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text weight="2">Уровень {level}</Text>
                    {user.is_super_admin && (
                        <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">
                            Admin
                        </span>
                    )}
                </div>
            </Cell>

            {/* Progress Bar - Custom implementation as it's specific */}
            <div style={{ padding: '0 20px 12px 20px' }}>
                <div className="h-1.5 w-full bg-[#efeff4] rounded-full overflow-hidden mb-1.5">
                    <div
                        className="h-full bg-[#2481cc] transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-[#8e8e93] uppercase tracking-wider">
                    <span>{currentXp} XP</span>
                    <span>{xpForNextLevel} XP</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px 20px' }}>
                {(!user.admin_status || user.admin_status === 'none') && !isAdmin && (
                    <Link to="/apply" style={{ textDecoration: 'none' }}>
                        <Button size="s" mode="bezeled">Стать автором</Button>
                    </Link>
                )}

                {user.admin_status === 'pending' && (
                    <Button size="s" mode="bezeled" disabled>Заявка: Ожидание</Button>
                )}

                {isAdmin && (
                    <Button size="s" mode="filled" onClick={() => setViewMode('admin')}>
                        В админку
                    </Button>
                )}
            </div>
        </Section>
    );
};
