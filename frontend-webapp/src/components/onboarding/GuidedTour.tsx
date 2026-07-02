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
        const margin = 16;
        const panelWidth = Math.min(340, window.innerWidth - margin * 2);
        const preferredLeft = coords.left + (coords.width / 2) - (panelWidth / 2);
        const left = Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, preferredLeft));
        const below = coords.top - sY + coords.height + 12;
        const above = coords.top - sY - 240;
        const top = below > window.innerHeight - 220 ? Math.max(margin, above) : below;

        return {
            top: `${top}px`,
            left: `${left}px`,
            width: `${panelWidth}px`,
        };
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {/* Background Overlay with hole */}
            <div className="absolute inset-0 bg-foreground/45 transition-opacity duration-300 pointer-events-auto"
                style={{ clipPath: getClipPath() }}
            />

            {/* Content box */}
            <div
                className={cn(
                    "absolute pointer-events-auto w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-card p-5 text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition-all duration-200 animate-in zoom-in-95 qa-bottom-safe",
                    !coords ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : ""
                )}
                style={getTooltipStyle()}
            >
                <div className="flex items-center justify-between mb-4">
                    <span className="qa-chip qa-chip-active">
                        {currentStep + 1} / {steps.length}
                    </span>
                    <button onClick={onComplete} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25">
                        <X size={18} />
                    </button>
                </div>

                <h3 className="mb-2 text-xl font-semibold leading-tight text-foreground">
                    {step.title}
                </h3>
                <p className="mb-6 text-sm font-medium leading-6 text-muted-foreground">
                    {step.content}
                </p>

                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-11 w-11 px-0"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                        >
                            <ChevronLeft size={20} />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="h-11 flex-1"
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
