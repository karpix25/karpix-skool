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
        color: "text-blue-500",
        bg: "bg-blue-500/10",
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
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
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
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col p-6 animate-in fade-in duration-500 overflow-hidden">
            {/* Background Decorative Blurs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full" />

            <div className="relative flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-12">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 transition-all duration-300 rounded-full",
                                i === currentSlide ? "w-8 bg-blue-500" : "w-2 bg-white/10"
                            )}
                        />
                    ))}
                </div>

                {/* Slide Content */}
                <div key={currentSlide} className="flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                    <div className={cn("w-24 h-24 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl transition-all", slides[currentSlide].bg, slides[currentSlide].color)}>
                        <SlideIcon size={40} strokeWidth={2.5} />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-blue-400 text-[10px] font-black tracking-widest uppercase mb-6">
                        <Sparkles size={12} />
                        <span>{slides[currentSlide].feature}</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-tight leading-tight">
                        {slides[currentSlide].title}
                    </h2>

                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        {slides[currentSlide].description}
                    </p>
                </div>
            </div>

            {/* Button */}
            <div className="relative z-10 pb-12 pt-8">
                <Button
                    onClick={nextSlide}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-lg font-black uppercase shadow-2xl shadow-blue-500/20 group"
                >
                    {currentSlide < slides.length - 1 ? "Далее" : "Создать школу"}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pb-6 text-slate-500">
                <Shield size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Безопасная платформа обучения</span>
            </div>
        </div>
    );
};
