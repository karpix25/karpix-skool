import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ActionItem {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    colorClass: string;
    bgClass: string;
    isSvg?: boolean;
}

interface ActionOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const actionItems: ActionItem[] = [
    {
        id: 'course',
        title: 'Create New Course',
        subtitle: 'Set up a new curriculum',
        icon: 'auto_stories',
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
    },
    {
        id: 'lesson',
        title: 'Add New Lesson',
        subtitle: 'Upload to an existing module',
        icon: 'video_library',
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10',
    },
    {
        id: 'announcement',
        title: 'Send Announcement',
        subtitle: 'Broadcast via Telegram Bot',
        icon: '',
        colorClass: 'text-[#0088cc]',
        bgClass: 'bg-[#0088cc]/10',
        isSvg: true,
    },
    {
        id: 'xp',
        title: 'Add Manual XP',
        subtitle: 'Reward specific student progress',
        icon: 'stars',
        colorClass: 'text-orange-500',
        bgClass: 'bg-orange-500/10',
    },
];

export const ActionOverlay: React.FC<ActionOverlayProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col justify-end items-center bg-black/60 backdrop-blur-[2px] px-4 pb-12 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-6 transform transition-transform duration-300 translate-y-0 animate-in slide-in-from-bottom-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className="flex justify-center p-3">
                    <div className="w-12 h-1.5 bg-muted rounded-full"></div>
                </div>

                {/* Menu Options */}
                <div className="px-2 pb-6">
                    {actionItems.map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-4 p-4 hover:bg-secondary rounded-xl transition-colors text-left group"
                            onClick={() => {
                                console.log(`Action clicked: ${item.title}`);
                                onClose();
                            }}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center group-active:scale-90 transition-transform",
                                item.bgClass,
                                item.colorClass
                            )}>
                                {item.isSvg ? (
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2s-.21-.05-.31-.03c-.14.03-2.3 1.45-6.48 4.28-.61.42-1.16.63-1.65.61-.54-.01-1.58-.31-2.35-.57-.95-.32-1.7-.49-1.63-.98.04-.26.39-.52 1.05-.78 4.12-1.79 6.87-2.97 8.24-3.55 3.93-1.65 4.74-1.93 5.28-1.94.12 0 .38.03.55.17.14.12.18.28.2.4.02.09.03.26.02.41z"></path>
                                    </svg>
                                ) : (
                                    <span className="material-icons text-2xl">{item.icon}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-[15px]">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Floating Action Button (Internal close) */}
            <button
                className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all transform hover:rotate-180 duration-500"
                onClick={onClose}
            >
                <X size={32} strokeWidth={3} />
            </button>

            {/* iOS Home Indicator Space */}
            <div className="h-4 w-full"></div>
        </div>
    );
};
