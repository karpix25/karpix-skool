import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { BookOpen, PlayCircle, Send, Star } from 'lucide-react';

interface ActionItem {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
}

interface ActionOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const actionItems: ActionItem[] = [
    {
        id: 'course',
        title: 'Создать курс',
        subtitle: 'Настройте новую учебную программу',
        icon: <BookOpen className="w-6 h-6" />,
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
    },
    {
        id: 'lesson',
        title: 'Добавить урок',
        subtitle: 'Загрузите в существующий модуль',
        icon: <PlayCircle className="w-6 h-6" />,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10',
    },
    {
        id: 'announcement',
        title: 'Отправить объявление',
        subtitle: 'Рассылка через Telegram бота',
        icon: <Send className="w-6 h-6" />,
        colorClass: 'text-[#0088cc]',
        bgClass: 'bg-[#0088cc]/10',
    },
    {
        id: 'xp',
        title: 'Начислить XP',
        subtitle: 'Наградите конкретного ученика',
        icon: <Star className="w-6 h-6" />,
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-500/10',
    },
];

export const ActionOverlay: React.FC<ActionOverlayProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    if (!isOpen) return null;

    const handleAction = (id: string) => {
        if (id === 'course') {
            navigate('/courses');
            // Small delay to ensure navigation happened if we were on another page
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-create-course'));
            }, 100);
        } else {
            alert('Данная функция находится в разработке 🚀');
        }
        onClose();
    };

    return (
        <div
        className="fixed inset-0 z-[100] flex flex-col justify-end items-center bg-slate-950/40 backdrop-blur-[2px] px-4 pb-12 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-md border border-border mb-6 transform transition-transform duration-300 translate-y-0 animate-in slide-in-from-bottom-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className="flex justify-center p-4">
                    <div className="w-12 h-1 bg-border rounded-full"></div>
                </div>

                {/* Menu Options */}
                <div className="px-3 pb-6 space-y-1">
                    {actionItems.map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-4 p-4 hover:bg-muted/60 rounded-lg transition-all active:scale-[0.99] text-left group"
                            onClick={() => handleAction(item.id)}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                                item.bgClass,
                                item.colorClass
                            )}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[15px] leading-tight mb-1">{item.title}</h3>
                                <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{item.subtitle}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Spacer to accommodate the FAB from BottomNav */}
            <div className="h-20 w-full shrink-0 invisible pointer-events-none"></div>
        </div>
    );
};
