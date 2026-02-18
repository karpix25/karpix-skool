import React, { useState } from 'react';
import {
    Sparkles,
    Trophy,
    Bot,
    Rocket,
    ArrowRight,
    Target
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface WelcomeCarouselProps {
    onComplete: () => void;
    schoolName: string;
}

const slides = [
    {
        title: "Добро пожаловать!",
        description: "Вы стали частью профессионального обучающего сообщества. Здесь знания превращаются в результат.",
        icon: Rocket,
        color: "text-skool-blue",
        bg: "bg-skool-blue/10",
        feature: "Курсы и База Знаний"
    },
    {
        title: "Играй и учись",
        description: "За каждый пройденный урок вы получаете XP. Соревнуйтесь в рейтинге и открывайте новые уровни мастерства.",
        icon: Trophy,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        feature: "Система Геймификации"
    },
    {
        title: "Твой ИИ-наставник",
        description: "В каждом уроке вас ждет персональный помощник, готовый ответить на любые вопросы по материалу 24/7.",
        icon: Bot,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        feature: "Интеллектуальная поддержка"
    }
];

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ onComplete, schoolName }) => {
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
        <div className="fixed inset-0 z-[100] bg-skool-navy flex flex-col p-6 animate-in fade-in duration-500 overflow-hidden">
            {/* Background Decorative Blurs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-skool-blue/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-skool-blue/10 blur-[100px] rounded-full" />

            <div className="relative flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-12">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === currentSlide ? "w-8 bg-skool-blue" : "w-2 bg-white/10"
                            )}
                        />
                    ))}
                </div>

                {/* Slide Content */}
                <div key={currentSlide} className="flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                    <div className={cn("w-24 h-24 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl transition-all", slides[currentSlide].bg, slides[currentSlide].color)}>
                        <SlideIcon size={40} strokeWidth={2.5} />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-skool-blue text-[10px] font-black tracking-widest uppercase mb-6">
                        <Sparkles size={12} />
                        <span>{slides[currentSlide].feature}</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-tight leading-tight">
                        {slides[currentSlide].title}
                    </h2>

                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        {slides[currentSlide].description}
                    </p>

                    {currentSlide === 0 && (
                        <div className="mt-8 flex items-center gap-2 text-white/40 text-sm font-bold">
                            <Target size={16} />
                            <span>Школа: {schoolName}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Button */}
            <div className="relative z-10 pb-12 pt-8">
                <Button
                    onClick={nextSlide}
                    className="w-full h-16 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl text-lg font-black uppercase shadow-2xl shadow-skool-blue/20 group"
                >
                    {currentSlide < slides.length - 1 ? "Далее" : "Начать обучение"}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>

            <div className="pb-2">
                <div className="w-32 h-1.5 bg-white/5 rounded-full mx-auto"></div>
            </div>
        </div>
    );
};
