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
            path: '/settings',
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
        <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card transition-colors duration-300">
            <div className="bg-muted/30 p-5 sm:p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-primary w-5 h-5" />
                            <h2 className="text-xl font-semibold">Запуск вашей школы</h2>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">Выполните эти шаги, чтобы полностью подготовить платформу к приему студентов.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-card px-5 py-3 rounded-lg border border-border">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-12 h-12 transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * progress) / 100} className="text-primary transition-all duration-1000" />
                            </svg>
                            <span className="absolute text-[10px] font-black">{Math.round(progress)}%</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground">Прогресс</p>
                            <p className="text-sm font-bold">{completedCount} из {tasks.length} шагов</p>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="grid gap-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={cn(
                                "group relative flex items-center gap-4 p-4 rounded-lg border transition-colors duration-200",
                                task.isCompleted ? "bg-success/5 border-success/20" : "bg-card border-border hover:border-primary/30"
                            )}
                        >
                            <div className={cn(
                                "w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-200",
                                task.isCompleted ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                            )}>
                                {task.isCompleted ? <CheckCircle2 size={24} /> : <task.icon size={24} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className={cn("font-bold text-sm", task.isCompleted && "line-through opacity-60")}>{task.title}</h3>
                                <p className="text-xs text-muted-foreground transition-all">{task.description}</p>
                            </div>

                            {task.path && !task.isCompleted && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(task.path!)}
                                    className="rounded-lg font-bold text-[10px] hover:bg-primary/10 hover:text-primary shrink-0"
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
                            className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold shadow-sm animate-in zoom-in"
                        >
                            {isCompleting ? "Загрузка..." : "Завершить онбординг"}
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground/40 italic">
                    <HelpCircle size={14} />
                    <span className="text-[10px] font-bold">Нужна помощь? Напишите саппорту</span>
                </div>
            </CardContent>
        </Card>
    );
};
