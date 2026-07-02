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
        color: "text-primary",
        bg: "bg-primary/10",
        feature: "Курсы и База Знаний"
    },
    {
        title: "Играй и учись",
        description: "За каждый пройденный урок вы получаете XP. Соревнуйтесь в рейтинге и открывайте новые уровни мастерства.",
        icon: Trophy,
        color: "text-amber-600",
        bg: "bg-amber-400/10",
        feature: "Система Геймификации"
    },
    {
        title: "Твой ИИ-наставник",
        description: "В каждом уроке вас ждет персональный помощник, готовый ответить на любые вопросы по материалу 24/7.",
        icon: Bot,
        color: "text-emerald-600",
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
        <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background p-5 animate-in fade-in duration-500 min-[380px]:p-6">
            <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center">
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-12">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"
                            )}
                        />
                    ))}
                </div>

                {/* Slide Content */}
                <div key={currentSlide} className="flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                    <div className={cn("mb-8 flex h-20 w-20 items-center justify-center rounded-xl border border-border/70 transition-colors", slides[currentSlide].bg, slides[currentSlide].color)}>
                        <SlideIcon size={40} strokeWidth={2.5} />
                    </div>

                    <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        <Sparkles size={12} />
                        <span>{slides[currentSlide].feature}</span>
                    </div>

                    <h2 className="mb-4 text-2xl font-semibold leading-tight text-foreground min-[380px]:text-3xl">
                        {slides[currentSlide].title}
                    </h2>

                    <p className="text-base font-medium leading-relaxed text-muted-foreground min-[380px]:text-lg">
                        {slides[currentSlide].description}
                    </p>

                    {currentSlide === 0 && (
                        <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <Target size={16} />
                            <span>Школа: {schoolName}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Button */}
            <div className="relative z-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
                <Button
                    onClick={nextSlide}
                    className="group h-14 w-full rounded-lg bg-primary text-base font-semibold hover:bg-primary/90"
                >
                    {currentSlide < slides.length - 1 ? "Далее" : "Начать обучение"}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};
