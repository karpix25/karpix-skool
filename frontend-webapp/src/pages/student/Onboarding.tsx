
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Loader2, X, ArrowLeft, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { HorizontalRail } from '../../components/ui/horizontal-rail';
import { generateSchoolRoadmap, type AIResponse } from '../../services/roadmapService';

type AppState = 'FORM' | 'LOADING' | 'RESULT';

interface BackendValidationError {
    msg?: string;
}

interface BackendErrorResponse {
    response?: {
        data?: {
            detail?: string | BackendValidationError[];
        };
    };
}

const APP_STATE = {
    FORM: 'FORM' as AppState,
    LOADING: 'LOADING' as AppState,
    RESULT: 'RESULT' as AppState,
};

export const Onboarding: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<AppState>(APP_STATE.FORM);
    const [schoolName, setSchoolName] = useState('');
    const [details, setDetails] = useState('');
    const [aiResult, setAiResult] = useState<AIResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [agreed, setAgreed] = useState(false); // Deactivated for now

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedSchoolName = schoolName.trim();
        const trimmedDetails = details.trim();

        if (!trimmedSchoolName || !trimmedDetails) {
            setError('Заполните название школы и коротко опишите, чему будете обучать.');
            return;
        }

        setIsSubmitting(true);
        setView(APP_STATE.LOADING);
        setError(null);

        try {
            // 1. Send request to backend
            console.log("Onboarding: requesting admin access...");
            await api.post('/auth/request-admin', {
                school_name: trimmedSchoolName,
                details: trimmedDetails
            });

            // 2. Generate AI Roadmap
            console.log("Onboarding: generating AI roadmap...");
            try {
                const result = await generateSchoolRoadmap({ name: trimmedSchoolName, teachingGoal: trimmedDetails });
                setAiResult(result);
            } catch (aiErr) {
                console.error("AI Roadmap failed:", aiErr);
                // Non-critical failure: we can still show a basic success message without the roadmap
                setAiResult({
                    successMessage: "Ваша школа почти готова! План обучения будет сгенерирован позже.",
                    curriculum: []
                });
            }

            // 3. Update profile status
            await refreshProfile();

            setView(APP_STATE.RESULT);
        } catch (err: unknown) {
            console.error("Onboarding Error:", err);
            const backendDetail = (err as BackendErrorResponse).response?.data?.detail;
            const message = typeof backendDetail === 'string' ? backendDetail :
                (Array.isArray(backendDetail) ? backendDetail[0]?.msg : null);

            setError(message || "Произошла ошибка при регистрации школы. Проверьте данные и попробуйте снова.");
            setView(APP_STATE.FORM);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setView(APP_STATE.FORM);
        setSchoolName('');
        setDetails('');
        setAiResult(null);
        setError(null);
    };

    // If already pending, show result or simplified pending screen
    if (user?.admin_status === 'pending' && view === APP_STATE.FORM) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Loader2 size={40} className="animate-spin" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-2xl font-semibold text-foreground">Заявка на рассмотрении</h1>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                            Ваша заявка проверяется. Мы уведомим вас через Telegram после одобрения.
                        </p>
                    </div>
                    <div className="pt-4 space-y-4">
                        <Button
                            className="h-12 w-full gap-2 rounded-lg bg-primary text-sm font-semibold hover:bg-primary/90"
                            onClick={() => refreshProfile()}
                            disabled={isSubmitting}
                        >
                            <RefreshCw size={16} className={isSubmitting ? "animate-spin" : ""} /> Обновить статус
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-12 w-full rounded-lg text-sm font-semibold text-muted-foreground"
                            onClick={() => navigate('/')}
                        >
                            Вернуться на главную
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (user?.admin_status === 'rejected') {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
                        <X size={40} />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-2xl font-semibold text-foreground">Доступ ограничен</h1>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                            К сожалению, ваша заявка не была одобрена.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        className="h-12 w-full rounded-lg text-sm font-semibold text-muted-foreground"
                        onClick={() => navigate('/')}
                    >
                        Вернуться на главную
                    </Button>
                </div>
            </div>
        );
    }

    if (view === APP_STATE.LOADING) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in duration-300">
                <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">Анализируем вашу идею</h2>
                <p className="max-w-xs animate-pulse text-muted-foreground">
                    Создаём персональный план для <span className="font-medium text-foreground">{schoolName}</span>...
                </p>
            </div>
        );
    }

    if (view === APP_STATE.RESULT && aiResult) {
        return (
            <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center bg-background p-5 pb-[max(2rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-700 min-[380px]:p-6 md:p-12">
                <header className="w-full flex justify-between items-center mb-10">
                    <button onClick={handleReset} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-card transition-colors hover:bg-muted/40">
                        <ArrowLeft className="text-muted-foreground" size={20} />
                    </button>
                    <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
                        План успеха
                    </div>
                </header>

                <div className="text-center mb-10">
                    <h1 className="mb-4 text-2xl font-semibold text-foreground min-[380px]:text-3xl">Вы готовы к запуску!</h1>
                    <p className="mb-6 leading-relaxed text-muted-foreground">"{aiResult.successMessage}"</p>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-[11px] font-semibold text-success">
                        <CheckCircle size={14} /> Заявка успешно отправлена
                    </div>
                </div>

                <div className="space-y-6 w-full mb-12">
                    {aiResult.curriculum.map((step, idx) => (
                        <div key={idx} className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 transition-colors hover:bg-muted/20 min-[380px]:p-6">
                            <div className="absolute right-4 top-4 text-3xl font-semibold leading-none text-muted-foreground/15">0{idx + 1}</div>
                            <h3 className="relative z-10 mb-2 text-lg font-semibold text-primary">{step.title}</h3>
                            <p className="relative z-10 mb-4 text-sm text-muted-foreground">{step.description}</p>
                            <ul className="space-y-2 relative z-10">
                                {step.tasks.map((task, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-3 text-xs text-muted-foreground">
                                        <CheckCircle className="mt-0.5 shrink-0 text-success" size={14} />
                                        {task}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99]"
                >
                    Вернуться на главную
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-clip bg-background">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/95 p-3 backdrop-blur">
                <button onClick={() => navigate('/')} className="-ml-2 p-2 text-muted-foreground transition-colors hover:text-foreground">
                    <X size={20} />
                </button>
                <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                    Доступ автора
                </div>
            </header>

            <main className="z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700 min-[380px]:px-5">
                {/* Compact rocket image */}
                <div className="relative my-4 flex w-full items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-card">
                        <img
                            alt="3D Rocket Launching"
                            className="h-14 w-14 object-contain"
                            style={{ animationDuration: '4s' }}
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhlBWjn58cn_jKxb97B05v7A3tH_kL4wGk907R61U7nyqpHD7UCn6KokUNwyaw0lUN4Sliij1as7fEDOGvjdDhC-SBrTSDx5dBMvHgjn_2n_6-itTFUmwh5i0IqCVGlDq4r2XMn2hJ02UfbTjY54YCsgBRhaaHmeA7oeS3JBrkXmqANAIWzihZWagFPIfyOcoJ7CYigS7N2w_0mCyt6NK7aFDgiaaNPZOs1aJjd2ZDs9IPSHKvuNd4OzoXeOpzzCSjnouNSQ2kxwi-"
                        />
                    </div>
                </div>

                {/* Compact title */}
                <div className="mb-5 space-y-1.5 px-2 text-center">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Запустите свою школу
                    </h1>
                    <p className="text-[13px] leading-snug text-muted-foreground">
                        Превратите свой опыт в процветающее сообщество.
                    </p>
                </div>

                {/* Inline compact benefits row */}
                <HorizontalRail
                    role="list"
                    aria-label="Возможности школы"
                    className="mb-4"
                    contentClassName="gap-2"
                >
                    {[
                        { icon: 'school', color: 'text-primary bg-primary/10', label: 'Курсы' },
                        { icon: 'forum', color: 'text-success bg-success/10', label: 'Сообщество' },
                        { icon: 'military_tech', color: 'text-vip bg-vip/10', label: 'Геймификация' },
                    ].map((b) => (
                        <div
                            key={b.icon}
                            role="listitem"
                            className="flex min-w-[9.5rem] shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
                        >
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${b.color}`}>
                                <span className="material-symbols-outlined text-[16px]">{b.icon}</span>
                            </div>
                            <span className="truncate text-[11px] font-semibold text-foreground">{b.label}</span>
                        </div>
                    ))}
                </HorizontalRail>

                {/* Compact form */}
                <form id="author-application-form" className="space-y-3" onSubmit={handleSubmit}>
                    {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-xs text-destructive">{error}</p>}
                    <div className="space-y-1.5">
                        <label className="ml-1 text-[12px] font-semibold text-muted-foreground" htmlFor="school-name">Название школы</label>
                        <input
                            required
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            id="school-name"
                            placeholder="Например, Академия трейдинга"
                            type="text"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="ml-1 text-[12px] font-semibold text-muted-foreground" htmlFor="teaching-desc">Чему вы будете обучать?</label>
                        <textarea
                            required
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="min-h-[90px] w-full resize-none rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            id="teaching-desc"
                            placeholder="Опишите ваши курсы и целевую аудиторию..."
                            rows={2}
                        ></textarea>
                    </div>
                </form>
            </main>

            {/* Sticky submit button */}
            <div className="sticky bottom-0 z-20 border-t border-border/60 bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur min-[380px]:px-5">
                <button
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
                    form="author-application-form"
                    type="submit"
                >
                    <span className="text-[15px] font-semibold">{isSubmitting ? 'Отправка...' : 'Отправить заявку'}</span>
                    {!isSubmitting && <ArrowRight size={18} />}
                </button>
                <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">
                    Онбординг автора
                </p>
            </div>
        </div>
    );
};
