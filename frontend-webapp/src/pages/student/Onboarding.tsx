
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Loader2, X, ArrowLeft, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import BenefitCard from './components/BenefitCard';
import { generateSchoolRoadmap, type AIResponse } from '../../services/roadmapService';

type AppState = 'FORM' | 'LOADING' | 'RESULT';

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
        if (!schoolName || !details) return;

        setIsSubmitting(true);
        setView(APP_STATE.LOADING);
        setError(null);

        try {
            // 1. Send request to backend
            await api.post('/auth/request-admin', {
                school_name: schoolName,
                details: details
            });

            // 2. Generate AI Roadmap
            const result = await generateSchoolRoadmap({ name: schoolName, teachingGoal: details });
            setAiResult(result);

            // 3. Update profile status
            await refreshProfile();

            setView(APP_STATE.RESULT);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Произошла ошибка при создании школы. Попробуйте ещё раз.");
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
            <div className="min-h-screen bg-skool-navy flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="w-20 h-20 bg-skool-blue/20 text-skool-blue rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Loader2 size={40} className="animate-spin" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Заявка на рассмотрении</h1>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Ваша заявка проверяется. Мы уведомим вас через Telegram после одобрения.
                        </p>
                    </div>
                    <div className="pt-4 space-y-4">
                        <Button
                            className="w-full h-14 rounded-2xl bg-skool-blue hover:bg-skool-blue/90 font-bold uppercase tracking-widest text-xs gap-2"
                            onClick={() => refreshProfile()}
                            disabled={isSubmitting}
                        >
                            <RefreshCw size={16} className={isSubmitting ? "animate-spin" : ""} /> Обновить статус
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-12 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest"
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
            <div className="min-h-screen bg-skool-navy flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <X size={40} />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Доступ ограничен</h1>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            К сожалению, ваша заявка не была одобрена.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full h-12 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest"
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
            <div className="min-h-screen bg-skool-navy flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 border-4 border-skool-blue/20 border-t-skool-blue rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold mb-2 text-white">Анализируем вашу идею</h2>
                <p className="text-slate-400 max-w-xs animate-pulse">
                    Создаём персональный план для <span className="text-white font-medium">{schoolName}</span>...
                </p>
            </div>
        );
    }

    if (view === APP_STATE.RESULT && aiResult) {
        return (
            <div className="min-h-screen bg-skool-navy p-6 md:p-12 flex flex-col items-center max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700">
                <header className="w-full flex justify-between items-center mb-10">
                    <button onClick={handleReset} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:scale-95 transition-transform hover:bg-white/10">
                        <ArrowLeft className="text-white/70" size={20} />
                    </button>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-skool-blue bg-skool-blue/20 px-3 py-1.5 rounded-full">
                        План успеха
                    </div>
                </header>

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-4 text-white">Вы готовы к запуску!</h1>
                    <p className="text-slate-400 leading-relaxed italic mb-6">"{aiResult.successMessage}"</p>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl inline-flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle size={14} /> Заявка успешно отправлена
                    </div>
                </div>

                <div className="space-y-6 w-full mb-12">
                    {aiResult.curriculum.map((step, idx) => (
                        <div key={idx} className="benefit-card p-6 rounded-2xl relative overflow-hidden group hover:bg-white/5 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-bold text-white leading-none">0{idx + 1}</div>
                            <h3 className="text-lg font-bold text-skool-blue mb-2 relative z-10">{step.title}</h3>
                            <p className="text-sm text-slate-300 mb-4 relative z-10">{step.description}</p>
                            <ul className="space-y-2 relative z-10">
                                {step.tasks.map((task, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-3 text-xs text-slate-400">
                                        <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={14} />
                                        {task}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-skool-blue hover:bg-skool-blue/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-skool-blue/20 flex items-center justify-center gap-2 mb-8"
                >
                    Вернуться на главную
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-skool-navy flex flex-col max-w-md mx-auto w-full">
            <header className="p-4 flex justify-between items-center z-20 sticky top-0 bg-skool-navy/80 backdrop-blur-sm">
                <button onClick={() => navigate('/')} className="text-white/50 hover:text-white transition-colors p-2 -ml-2">
                    <X size={24} />
                </button>
                <div className="text-[10px] font-bold tracking-widest uppercase text-skool-blue bg-skool-blue/20 px-3 py-1.5 rounded-full">
                    Доступ автора
                </div>
            </header>

            <main className="flex-1 px-6 pb-12 flex flex-col z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="relative w-full aspect-square max-h-[220px] my-4 flex items-center justify-center">
                    <div className="w-full h-full bg-white/5 rounded-[40px] flex items-center justify-center overflow-hidden border border-white/5 relative group">
                        <img
                            alt="3D Rocket Launching"
                            className="w-40 h-40 object-contain drop-shadow-[0_0_30px_rgba(19,91,236,0.3)] animate-pulse"
                            style={{ animationDuration: '4s' }}
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhlBWjn58cn_jKxb97B05v7A3tH_kL4wGk907R61U7nyqpHD7UCn6KokUNwyaw0lUN4Sliij1as7fEDOGvjdDhC-SBrTSDx5dBMvHgjn_2n_6-itTFUmwh5i0IqCVGlDq4r2XMn2hJ02UfbTjY54YCsgBRhaaHmeA7oeS3JBrkXmqANAIWzihZWagFPIfyOcoJ7CYigS7N2w_0mCyt6NK7aFDgiaaNPZOs1aJjd2ZDs9IPSHKvuNd4OzoXeOpzzCSjnouNSQ2kxwi-"
                        />
                    </div>
                </div>

                <div className="space-y-3 mb-8 text-center px-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        Запустите свою школу
                    </h1>
                    <p className="text-slate-400 leading-relaxed text-[15px]">
                        Превратите свой опыт в процветающее сообщество. Всё необходимое для создания, вовлечения и масштабирования.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-10">
                    <BenefitCard
                        icon="school"
                        iconColor="bg-skool-blue/10 text-skool-blue"
                        title="Создание курсов"
                        subtitle="Структурированные учебные программы"
                    />
                    <BenefitCard
                        icon="forum"
                        iconColor="bg-emerald-500/10 text-emerald-500"
                        title="Вовлечение студентов"
                        subtitle="Активные обсуждения в сообществе"
                    />
                    <BenefitCard
                        icon="military_tech"
                        iconColor="bg-amber-500/10 text-amber-500"
                        title="Геймификация"
                        subtitle="Рейтинги и награды"
                    />
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-xs text-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">{error}</p>}
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-400 ml-1" htmlFor="school-name">Название школы</label>
                        <input
                            required
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="ios-input w-full rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 transition-all border-white/5 focus:bg-[#243147]"
                            id="school-name"
                            placeholder="Например, Академия трейдинга"
                            type="text"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-400 ml-1" htmlFor="teaching-desc">Чему вы будете обучать?</label>
                        <textarea
                            required
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="ios-input w-full rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 transition-all resize-none border-white/5 min-h-[120px] focus:bg-[#243147]"
                            id="teaching-desc"
                            placeholder="Опишите ваши курсы и целевую аудиторию..."
                            rows={3}
                        ></textarea>
                    </div>
                    {/* Deactivated legal checkbox
                    <div className="flex items-start gap-3 px-1">
                        <input
                            type="checkbox"
                            id="legal-agree"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 checked:bg-skool-blue"
                        />
                        <label htmlFor="legal-agree" className="text-[12px] text-slate-400 leading-tight cursor-pointer">
                            Я согласен с <button type="button" onClick={() => navigate('/legal?type=tos')} className="text-skool-blue hover:underline">Условиями использования</button> и <button type="button" onClick={() => navigate('/legal?type=privacy')} className="text-skool-blue hover:underline">Политикой конфиденциальности</button>
                        </label>
                    </div>
                    */}

                    <div className="pt-4">
                        <button
                            disabled={isSubmitting}
                            className="w-full bg-skool-blue hover:bg-skool-blue/90 disabled:opacity-50 text-white font-bold py-5 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-skool-blue/20 flex items-center justify-center gap-3"
                            type="submit"
                        >
                            <span className="text-[17px]">{isSubmitting ? 'Отправка...' : 'Отправить заявку'}</span>
                            {!isSubmitting && <ArrowRight size={20} />}
                        </button>
                        <p className="text-center text-[10px] text-slate-600 mt-6 uppercase tracking-[0.2em] font-black">
                            Онбординг автора
                        </p>
                    </div>
                </form>
            </main>

            <div className="pb-6 pt-2 mt-auto">
                <div className="w-32 h-1.5 bg-white/5 rounded-full mx-auto"></div>
            </div>
        </div>
    );
};
