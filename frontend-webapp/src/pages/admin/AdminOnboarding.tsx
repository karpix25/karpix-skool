import React, { useState } from 'react';
import {
    Plus,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    HelpCircle,
    Sparkles,
    type LucideIcon
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface OnboardingTask {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel: string;
    path?: string;
    isCompleted: boolean;
}

interface AdminOnboardingTenant {
    telegram_group_id?: string | number | null;
}

export const AdminOnboarding: React.FC<{ tenant: AdminOnboardingTenant | null; coursesCount?: number }> = ({ tenant, coursesCount = 0 }) => {
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();
    const [isCompleting, setIsCompleting] = useState(false);

    const tasks: OnboardingTask[] = [
        {
            id: 'bot_setup',
            title: 'Привязать Telegram группу',
            description: 'Добавьте бота в группу и введите /setup, чтобы активировать синхронизацию.',
            icon: MessageSquare,
            actionLabel: 'Инструкция',
            path: '/admin/settings',
            isCompleted: !!tenant?.telegram_group_id
        },
        {
            id: 'create_course',
            title: 'Создать первый курс',
            description: 'База вашей школы — это контент. Создайте структуру уроков.',
            icon: Plus,
            actionLabel: 'Создать',
            path: '/courses',
            isCompleted: coursesCount > 0
        }
    ];

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const progress = (completedCount / tasks.length) * 100;

    const handleFinishOnboarding = async () => {
        setIsCompleting(true);
        try {
            await api.post('/webapp/onboarding/complete');
            await refreshProfile();
        } catch (err) {
            console.error(err);
        } finally {
            setIsCompleting(false);
        }
    };

    return (
        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-card transition-all duration-500 hover:shadow-primary/5">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-primary w-5 h-5 animate-pulse" />
                            <h2 className="text-2xl font-black tracking-tight uppercase italic">Запуск вашей школы</h2>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">Выполните эти шаги, чтобы полностью подготовить платформу к приему студентов.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-background/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-border/50">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-12 h-12 transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * progress) / 100} className="text-primary transition-all duration-1000" />
                            </svg>
                            <span className="absolute text-[10px] font-black">{Math.round(progress)}%</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Прогресс</p>
                            <p className="text-sm font-bold">{completedCount} из {tasks.length} шагов</p>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="grid gap-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={cn(
                                "group relative flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300",
                                task.isCompleted ? "bg-muted/30 border-success/20 opacity-80" : "bg-card border-border/50 hover:border-primary/30 hover:shadow-lg"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                task.isCompleted ? "bg-success/10 text-success" : "bg-primary/10 text-primary group-hover:scale-110"
                            )}>
                                {task.isCompleted ? <CheckCircle2 size={24} /> : <task.icon size={24} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className={cn("font-bold text-sm tracking-tight", task.isCompleted && "line-through opacity-60")}>{task.title}</h3>
                                <p className="text-xs text-muted-foreground transition-all">{task.description}</p>
                            </div>

                            {task.path && !task.isCompleted && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(task.path!)}
                                    className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary shrink-0"
                                >
                                    {task.actionLabel}
                                    <ArrowRight size={14} className="ml-1" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {progress === 100 && (
                    <div className="pt-4">
                        <Button
                            onClick={handleFinishOnboarding}
                            disabled={isCompleting}
                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 animate-in zoom-in"
                        >
                            {isCompleting ? "Загрузка..." : "Завершить онбординг"}
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground/40 italic">
                    <HelpCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Нужна помощь? Напишите саппорту</span>
                </div>
            </CardContent>
        </Card>
    );
};
