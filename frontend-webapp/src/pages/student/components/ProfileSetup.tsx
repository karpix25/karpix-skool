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
import { toUploadedMediaUrl } from '../../../lib/uploadedMedia';

interface ProfileSetupProps {
    onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
    const { user, membership, activeTenantId, refreshProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const avatarUrl = toUploadedMediaUrl(user?.avatar_url);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const tenantId = activeTenantId || membership?.tenant_id;
            if (!tenantId) {
                throw new Error('Missing tenant_id for student onboarding completion');
            }

            // Mark as onboarded on backend
            await api.post('/webapp/onboarding/complete', null, {
                params: { tenant_id: tenantId }
            });
            await refreshProfile(tenantId);
            onComplete();
        } catch (err) {
            console.error(err);
            alert('Ошибка при настройке профиля');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background p-5 animate-in slide-in-from-right duration-500 no-scrollbar min-[380px]:p-6">
            <header className="py-2 flex justify-center mb-6">
                <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-semibold text-primary">
                    Настройка профиля
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-sm mx-auto w-full pb-10">
                <div className="text-center mb-6 space-y-3">
                    <h1 className="text-2xl font-semibold leading-tight text-foreground min-[380px]:text-3xl">Добро пожаловать, {user?.username}!</h1>
                    <p className="font-medium leading-relaxed text-muted-foreground">
                        Твой профиль готов. Теперь ты можешь приступать к обучению и копить XP.
                    </p>
                </div>

                <div className="relative mx-auto mb-8">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card min-[380px]:h-28 min-[380px]:w-28">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-muted-foreground/50" />
                        )}
                    </div>
                    <div className="absolute bottom-[-4px] right-[-4px] flex h-9 w-9 items-center justify-center rounded-lg border-4 border-background bg-primary">
                        <Check size={18} className="text-primary-foreground" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                    <div className="space-y-2 rounded-xl border border-border/70 bg-card p-5">
                        <label className="ml-1 text-[11px] font-semibold text-muted-foreground">Никнейм в Рейтинге</label>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={18} className="shrink-0 text-primary" />
                            <span className="text-lg font-semibold text-foreground">{user?.username}</span>
                        </div>
                        <p className="mt-1 px-1 text-[10px] font-medium text-muted-foreground">
                            Имя подтягивается автоматически из твоего Telegram
                        </p>
                    </div>

                    <div className="mt-auto">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="group h-14 w-full rounded-lg bg-primary text-base font-semibold hover:bg-primary/90"
                        >
                            {isSubmitting ? "Загрузка..." : "Вперед к знаниям"}
                            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </form>
            </main>

            <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
    );
};
