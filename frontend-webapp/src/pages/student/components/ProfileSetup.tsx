import React, { useState } from 'react';
import {
    User,
    Check,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/client';

interface ProfileSetupProps {
    onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
    const { user, refreshProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Mark as onboarded on backend
            await api.post('/webapp/onboarding/complete');
            await refreshProfile();
            onComplete();
        } catch (err) {
            console.error(err);
            alert('Ошибка при настройке профиля');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-skool-navy flex flex-col p-6 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
            <header className="py-2 flex justify-center mb-6">
                <div className="text-[10px] font-black tracking-[0.2em] uppercase text-skool-blue bg-skool-blue/10 px-4 py-2 rounded-full border border-skool-blue/20">
                    Настройка профиля
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-sm mx-auto w-full pb-10">
                <div className="text-center mb-6 space-y-3">
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight leading-tight">Добро пожаловать, {user?.username}!</h1>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        Твой профиль готов. Теперь ты можешь приступать к обучению и копить XP.
                    </p>
                </div>

                <div className="relative mx-auto mb-8">
                    <div className="w-28 h-28 rounded-[40px] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-white/20" />
                        )}
                    </div>
                    <div className="absolute bottom-[-4px] right-[-4px] w-9 h-9 bg-skool-blue rounded-2xl flex items-center justify-center shadow-lg border-4 border-skool-navy">
                        <Check size={18} className="text-white" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Никнейм в Рейтинге</label>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={18} className="text-skool-blue shrink-0" />
                            <span className="text-white font-bold text-lg">{user?.username}</span>
                        </div>
                        <p className="text-[9px] text-slate-500/60 font-medium italic mt-1 px-1">
                            Имя подтягивается автоматически из твоего Telegram
                        </p>
                    </div>

                    <div className="mt-auto">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-16 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl text-lg font-black uppercase shadow-2xl shadow-skool-blue/20 group"
                        >
                            {isSubmitting ? "Загрузка..." : "Вперед к знаниям"}
                            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </form>
            </main>

            <div className="pb-2 mt-auto">
                <div className="w-24 h-1 bg-white/5 rounded-full mx-auto"></div>
            </div>
        </div>
    );
};
