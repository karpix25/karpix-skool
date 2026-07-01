import { Shield } from 'lucide-react';

export const SuperAdminLoading = () => (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-primary/5 rounded-[24px] border border-primary/20 flex items-center justify-center animate-pulse">
            <Shield className="text-primary/40" size={32} />
        </div>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mt-8 animate-in fade-in duration-1000">Подключение...</p>
    </div>
);
