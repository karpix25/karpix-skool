import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Cell, Section, Button, Text, Progress } from '@telegram-apps/telegram-ui';
import { LogOut } from 'lucide-react';

export const ProfileHeader: React.FC = () => {
    const { user, membership, logout, isAdmin, setViewMode } = useAuth();
    if (!user || !membership) return null;

    const currentXp = membership.xp || 0;
    const level = membership.level || 1;
    const xpForNextLevel = level * 50;
    const prevLevelXp = (level - 1) * 50;
    const progressInLevel = currentXp - prevLevelXp;
    const progressPercent = Math.min(Math.max((progressInLevel / 50) * 100, 0), 100);

    return (
        <Section header="Ваш профиль">
            <Cell
                before={
                    <Avatar
                        size={48}
                        src={user.avatar_url}
                        fallbackIcon={<span>{user.username?.[0]?.toUpperCase() || 'U'}</span>}
                    />
                }
                description={`Уровень ${level} • ID: ${user.telegram_id}`}
                after={
                    <Button
                        mode="plain"
                        color="critical"
                        onClick={() => { if (confirm('Выйти?')) logout(); }}
                    >
                        <LogOut size={20} />
                    </Button>
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text weight="2">{user.username || 'Пользователь'}</Text>
                    {user.is_super_admin && (
                        <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">
                            Admin
                        </span>
                    )}
                </div>
            </Cell>

            <Cell>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>{currentXp} XP</span>
                        <span style={{ marginLeft: 'auto' }}>{xpForNextLevel} XP</span>
                    </div>
                    <Progress value={progressPercent} />
                </div>
            </Cell>

            {/* Action Buttons */}
            {(user.admin_status === 'pending' || isAdmin) && (
                <Cell>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {user.admin_status === 'pending' && (
                            <Button size="s" mode="bezeled" disabled>Заявка: Ожидание</Button>
                        )}
                        {isAdmin && (
                            <Button size="s" mode="filled" onClick={() => setViewMode('admin')}>
                                Панель управления
                            </Button>
                        )}
                    </div>
                </Cell>
            )}
        </Section>
    );
};
