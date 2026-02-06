import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Rocket, ShieldCheck, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const Onboarding: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [details, setDetails] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/auth/request-admin', {
                school_name: schoolName,
                details: details
            });
            setSuccess(true);
            await refreshProfile();
        } catch (err: any) {
            alert('Ошибка при отправке заявки: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user?.admin_status === 'pending' || success) {
        return (
            <div className="min-h-screen bg-[#f1f4f7] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full text-center space-y-8 border border-white">
                    <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Clock size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Заявка в обработке</h1>
                        <p className="text-gray-500 font-medium">Ваша заявка на получение прав автора уже у Супер-админа. Мы отправим вам уведомление в Telegram, когда она будет одобрена. Обычно это занимает не более часа.</p>
                    </div>
                    <div className="pt-4 space-y-4">
                        <button
                            onClick={() => refreshProfile()}
                            className="w-full bg-white border-2 border-blue-500 text-blue-600 font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Loader2 size={16} className="animate-spin" /> Обновить статус
                        </button>
                        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 text-left">
                            <AlertCircle className="text-blue-500 shrink-0" size={20} />
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Проверяйте уведомления от нашего бота</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (user?.admin_status === 'rejected') {
        return (
            <div className="min-h-screen bg-[#f1f4f7] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full text-center space-y-8 border border-white">
                    <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Доступ ограничен</h1>
                        <p className="text-gray-500 font-medium">К сожалению, ваша заявка была отклонена. Если вы считаете, что это ошибка, пожалуйста, свяжитесь с поддержкой.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f4f7] flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full space-y-10 border border-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-blue-100 rotate-3">
                        <Rocket size={40} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Запустите свою онлайн-школу</h1>
                        <p className="text-gray-500 font-medium">Создавайте курсы, обучайте студентов и автоматизируйте продажи через Telegram за копейки.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Название школы</label>
                            <input
                                type="text"
                                placeholder="Например: Академия Трейдинга"
                                className="w-full bg-gray-50 border-transparent border p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none font-bold text-gray-900"
                                value={schoolName}
                                onChange={e => setSchoolName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Тематика или Сайт</label>
                            <textarea
                                placeholder="Кратко опишите чему вы обучаете..."
                                rows={3}
                                className="w-full bg-gray-50 border-transparent border p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none font-bold text-gray-900 resize-none"
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#0056D2] text-white font-black uppercase tracking-widest text-xs py-5 rounded-[24px] hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={18} strokeWidth={3} /> Отправить заявку</>}
                        </button>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-gray-400 group">
                                <CheckCircle size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Полный контроль контента</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400 group">
                                <CheckCircle size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Геймификация и Уровни</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400 group">
                                <CheckCircle size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Интеграция с TG Группами</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
