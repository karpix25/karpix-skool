import React, { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface TourStep {
    selector: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface GuidedTourProps {
    steps: TourStep[];
    onComplete: () => void;
    isOpen: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onComplete, isOpen }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [coords, setCoords] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

    useLayoutEffect(() => {
        if (!isOpen || !steps[currentStep]) return;

        const updateCoords = () => {
            const step = steps[currentStep];
            if (step.selector === 'body' || step.position === 'center') {
                setCoords(null);
                return;
            }

            const element = document.querySelector(step.selector);
            if (element) {
                const rect = element.getBoundingClientRect();
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setCoords(null); // Fallback to center if element not found
            }
        };

        // Delay slightly for any transitions
        const timer = setTimeout(updateCoords, 100);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords);
        };
    }, [currentStep, isOpen, steps]);

    if (!isOpen) return null;

    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;

    // Construct the clip-path for the hole
    const getClipPath = () => {
        if (!coords) return 'none';
        const { left: L, top: T, width: W, height: H } = coords;
        const R = L + W;
        const B = T + H;
        const sY = window.scrollY;

        // Adjust for scroll in clip-path if necessary, but fixed overlay uses screen coords
        // Actually, if overlay is fixed, we should use getBoundingClientRect without scrollY?
        // Let's re-calculate coords without scrollY for fixed overlay.
        return `polygon(0% 0%, 0% 100%, ${L}px 100%, ${L}px ${T - sY}px, ${R}px ${T - sY}px, ${R}px ${B - sY}px, ${L}px ${B - sY}px, ${L}px 100%, 100% 100%, 100% 0%)`;
    };

    const getTooltipStyle = () => {
        if (!coords) return {};
        const sY = window.scrollY;
        return {
            top: `${coords.top - sY + coords.height + 16}px`,
            left: `${Math.min(window.innerWidth - 300, Math.max(20, coords.left + (coords.width / 2) - 140))}px`
        };
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {/* Background Overlay with hole */}
            <div className="absolute inset-0 bg-black/70 transition-opacity duration-500 pointer-events-auto"
                style={{ clipPath: getClipPath() }}
            />

            {/* Content box */}
            <div
                className={cn(
                    "absolute pointer-events-auto w-[280px] bg-card border border-border/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[32px] p-6 transition-all duration-300 transform animate-in zoom-in-95 duration-200",
                    !coords ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
                )}
                style={getTooltipStyle()}
            >
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        {currentStep + 1} / {steps.length}
                    </span>
                    <button onClick={onComplete} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <X size={18} />
                    </button>
                </div>

                <h3 className="text-xl font-black text-foreground mb-2 uppercase tracking-tight italic leading-tight">
                    {step.title}
                </h3>
                <p className="text-[13px] text-muted-foreground font-medium leading-relaxed mb-6">
                    {step.content}
                </p>

                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-12 w-12 rounded-2xl border-border/50 bg-background/50"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                        >
                            <ChevronLeft size={20} />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                        onClick={() => isLast ? onComplete() : setCurrentStep(prev => prev + 1)}
                    >
                        {isLast ? "Поехали!" : "Далее"}
                        {!isLast && <ChevronRight size={18} className="ml-1" />}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
