import React, { useState } from 'react';
import {
    Sparkles,
    LayoutDashboard,
    Bot,
    Rocket,
    ArrowRight,
    Shield
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface AdminIntroCarouselProps {
    onComplete: () => void;
}

const slides = [
    {
        title: "Добро пожаловать, Автор!",
        description: "Вы получили доступ к мощной платформе для создания онлайн-школ. Здесь ваш опыт превращается в знания для тысяч учеников.",
        icon: Rocket,
        color: "text-primary",
        bg: "bg-primary/10",
        feature: "Ваша Школа"
    },
    {
        title: "Полный Контроль",
        description: "Управляйте курсами, уроками и следите за прогрессом студентов в реальном времени. Всё управление — у вас под рукой.",
        icon: LayoutDashboard,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        feature: "Элементы Управления"
    },
    {
        title: "Бот — ваш помощник",
        description: "Для начала работы нужно авторизовать вашего Telegram-бота. Это позволит автоматизировать доступ и общение с учениками.",
        icon: Bot,
        color: "text-success",
        bg: "bg-success/10",
        feature: "Авторизация Бота"
    }
];

export const AdminIntroCarousel: React.FC<AdminIntroCarouselProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(s => s + 1);
        } else {
            onComplete();
        }
    };

    const SlideIcon = slides[currentSlide].icon;

    return (
        <div className="fixed inset-0 z-[110] bg-background flex flex-col p-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="relative flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-12">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 transition-all duration-300 rounded-full",
                                i === currentSlide ? "w-8 bg-primary" : "w-2 bg-border"
                            )}
                        />
                    ))}
                </div>

                {/* Slide Content */}
                <div key={currentSlide} className="flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                    <div className={cn("w-20 h-20 rounded-lg flex items-center justify-center mb-8 border transition-colors", slides[currentSlide].bg, slides[currentSlide].color)}>
                        <SlideIcon size={40} strokeWidth={2.5} />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-card border border-border rounded-lg text-primary text-[10px] font-black mb-6">
                        <Sparkles size={12} />
                        <span>{slides[currentSlide].feature}</span>
                    </div>

                    <h2 className="text-3xl font-semibold text-foreground mb-4 leading-tight">
                        {slides[currentSlide].title}
                    </h2>

                    <p className="text-muted-foreground text-base font-medium leading-relaxed">
                        {slides[currentSlide].description}
                    </p>
                </div>
            </div>

            {/* Button */}
            <div className="relative z-10 pb-12 pt-8">
                <Button
                    onClick={nextSlide}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-sm group"
                >
                    {currentSlide < slides.length - 1 ? "Далее" : "Создать школу"}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pb-6 text-muted-foreground">
                <Shield size={14} />
                <span className="text-[10px] font-bold">Безопасная платформа обучения</span>
            </div>
        </div>
    );
};
