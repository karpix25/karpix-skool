import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabbar } from '@telegram-apps/telegram-ui';
import { Home, Users, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: '/', text: 'Главная', Icon: Home },
        { id: '/courses', text: 'Курсы', Icon: BookOpen },
        { id: '/students', text: 'Студенты', Icon: Users },
    ];

    if (isSuperAdmin) {
        tabs.push({ id: '/super', text: 'Админ', Icon: Shield });
    }

    return (
        <Tabbar>
            {tabs.map(({ id, text, Icon }) => (
                <Tabbar.Item
                    key={id}
                    text={text}
                    selected={location.pathname === id}
                    onClick={() => navigate(id)}
                >
                    <Icon size={24} />
                </Tabbar.Item>
            ))}
        </Tabbar>
    );
};
