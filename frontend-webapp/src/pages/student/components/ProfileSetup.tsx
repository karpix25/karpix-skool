import React, { useState } from 'react';
import {
    User,
    Camera,
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
    const [nickname, setNickname] = useState(user?.username || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        setIsSubmitting(true);
        try {
            // Update user profile
            await api.patch('/webapp/profile', { username: nickname });
            // Mark as onboarded on backend (we'll implement this endpoint next)
            await api.post('/webapp/onboarding/complete');
            await refreshProfile();
            onComplete();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении профиля');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-skool-navy flex flex-col p-6 animate-in slide-in-from-right duration-500 overflow-hidden">
            <header className="py-4 flex justify-center mb-8">
                <div className="text-[10px] font-black tracking-[0.2em] uppercase text-skool-blue bg-skool-blue/10 px-4 py-2 rounded-full border border-skool-blue/20">
                    Настройка профиля
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-sm mx-auto w-full">
                <div className="text-center mb-10 space-y-3">
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight leading-tight">Твоё Имя в Рейтинге</h1>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        Это имя будут видеть другие студенты в таблице лидеров. Сделай его легендарным.
                    </p>
                </div>

                <div className="relative mx-auto mb-12">
                    <div className="w-32 h-32 rounded-[48px] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="text-white/20" />
                        )}
                        <div className="absolute inset-0 bg-skool-navy/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <div className="absolute bottom-[-8px] right-[-8px] w-10 h-10 bg-skool-blue rounded-2xl flex items-center justify-center shadow-lg border-4 border-skool-navy">
                        <Check size={20} className="text-white" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 flex-1 flex flex-col">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Никнейм или Имя</label>
                        <input
                            type="text"
                            required
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="Введите никнейм..."
                            className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-skool-blue transition-all"
                        />
                        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500 font-medium">
                            <ShieldCheck size={14} className="text-skool-blue" />
                            <span>Будет отображаться публично</span>
                        </div>
                    </div>

                    <div className="mt-auto pb-12">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !nickname.trim()}
                            className="w-full h-16 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl text-lg font-black uppercase shadow-2xl shadow-skool-blue/20 group"
                        >
                            {isSubmitting ? "Сохранение..." : "Продолжить"}
                            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="text-center text-[10px] text-slate-600 mt-6 uppercase tracking-[0.2em] font-black">
                            Финальный шаг
                        </p>
                    </div>
                </form>
            </main>

            <div className="pb-2">
                <div className="w-32 h-1.5 bg-white/5 rounded-full mx-auto"></div>
            </div>
        </div>
    );
};
