import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';

interface MobileNavTab {
    id: string;
    text: string;
    icon: string;
}

interface MobileNavItemProps extends MobileNavTab {
    isActive: boolean;
    onNavigate: (path: string) => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ id, text, icon, isActive, onNavigate }) => (
    <button
        onClick={() => onNavigate(id)}
        className={cn(
            "flex flex-col items-center gap-1 transition-all duration-200",
            isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
        )}
    >
        <span className="material-icons">{icon}</span>
        <span className="text-[10px] font-medium">{text}</span>
    </button>
);

export const MobileNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs: MobileNavTab[] = [
        { id: '/', text: 'Stats', icon: 'dashboard' },
        { id: '/students', text: 'Students', icon: 'group' },
    ];

    if (isSuperAdmin) {
        tabs.push({ id: '/super', text: 'Super', icon: 'shield' });
    }

    // Add Courses & Settings to fill the layout
    tabs.push({ id: '/courses', text: 'Courses', icon: 'auto_stories' });
    tabs.push({ id: '/settings', text: 'Settings', icon: 'settings' });

    // Mid point for the "+" button
    const midIndex = Math.floor(tabs.length / 2);
    const leftTabs = tabs.slice(0, midIndex);
    const rightTabs = tabs.slice(midIndex);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between pb-4 z-50">
                {leftTabs.map(tab => (
                    <MobileNavItem
                        key={tab.id}
                        {...tab}
                        isActive={location.pathname === tab.id}
                        onNavigate={navigate}
                    />
                ))}

                {/* Center Add Button */}
                <div className="bg-primary w-12 h-12 rounded-full -mt-10 shadow-lg shadow-primary/30 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95">
                    <span className="material-icons text-white">add</span>
                </div>

                {rightTabs.map(tab => (
                    <MobileNavItem
                        key={tab.id}
                        {...tab}
                        isActive={location.pathname === tab.id}
                        onNavigate={navigate}
                    />
                ))}
            </nav>
            {/* iOS Home Indicator */}
            <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-400/30 rounded-full z-[60] pointer-events-none"></div>
        </>
    );
};
