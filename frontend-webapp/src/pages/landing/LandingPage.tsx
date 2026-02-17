import React, { useState } from 'react';
import {
    Rocket,
    CheckCircle2,
    XCircle,
    Users,
    BookOpen,
    Trophy,
    Zap,
    ChevronRight,
    Send,
    Sparkles,
    MessageSquare
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import api from '../../api/client';

export const LandingPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        telegram: '',
        schoolName: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/leads/apply', formData);
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Ошибка при отправке заявки. Пожалуйста, попробуйте позже.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-skool-navy text-white selection:bg-skool-blue/30 overflow-x-hidden">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-skool-blue/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-skool-blue/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10">
                {/* Navigation */}
                <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto backdrop-blur-md border-b border-white/5 sticky top-0 z-50 bg-skool-navy/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-skool-blue rounded-xl flex items-center justify-center shadow-lg shadow-skool-blue/20">
                            <Rocket className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">Karpix <span className="text-skool-blue">Skool</span></span>
                    </div>
                    <Button
                        onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-skool-blue hover:bg-skool-blue/90 rounded-full px-6 font-bold"
                    >
                        Стать Автором
                    </Button>
                </nav>

                {/* Hero Section */}
                <header className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center lg:text-left grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 animate-in slide-in-from-left duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-skool-blue text-sm font-bold tracking-wide">
                            <Sparkles size={16} />
                            <span>БУДУЩЕЕ ОБРАЗОВАНИЯ В TELEGRAM</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight uppercase">
                            Ваше обучение на <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-skool-blue to-cyan-400">
                                Максималках
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg lg:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                            Перестаньте использовать Телеграм как файлообменник. Превратите свой опыт в профессиональную образовательную платформу с геймификацией и AI.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Button
                                onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
                                size="lg"
                                className="h-16 px-10 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl text-lg font-black shadow-2xl shadow-skool-blue/20 group uppercase"
                            >
                                Создать свою школу
                                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-16 px-10 border-white/10 hover:bg-white/5 rounded-2xl text-lg font-bold uppercase transition-all"
                                onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Узнать больше
                            </Button>
                        </div>
                    </div>
                    <div className="relative animate-in zoom-in duration-1000">
                        <div className="absolute -inset-4 bg-skool-blue/20 blur-2xl rounded-[40px]" />
                        <div className="relative bg-white/5 border border-white/10 rounded-[40px] p-4 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <img
                                src="/api/placeholder/600/400"
                                alt="Platform Preview"
                                className="rounded-[32px] w-full shadow-inner"
                            />
                            <div className="absolute bottom-10 left-10 p-6 bg-skool-navy/80 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-xl uppercase tracking-tight">Level 24</p>
                                        <p className="text-slate-400 text-sm font-bold text-left">PRO MASTER</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Comparison Section */}
                <section id="comparison" className="py-32 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-20 space-y-4">
                            <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight">Эволюция Обучения</h2>
                            <p className="text-slate-400 font-medium max-w-2xl mx-auto uppercase tracking-wider text-sm">Почему профессионалы выбирают Karpix Skool вместо обычных групп</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="p-8 lg:p-12 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden group hover:border-red-500/20 transition-all duration-500">
                                <div className="absolute top-0 right-0 p-8 text-red-500/10">
                                    <XCircle size={120} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase">Обычная Группа</h3>
                                    <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">Аналоговый подход</p>
                                </div>
                                <ul className="space-y-5">
                                    {[
                                        "Хаос в сообщениях и файлах",
                                        "Нет структуры уроков",
                                        "Сложно отследить прогресс учеников",
                                        "Нулевая мотивация доходить до конца",
                                        "Ваш контент легко теряется в чате"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-4 text-slate-500">
                                            <XCircle className="text-red-500/20 shrink-0" size={24} />
                                            <span className="font-medium">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-8 lg:p-12 rounded-[40px] bg-skool-blue/5 border border-skool-blue/20 space-y-8 relative overflow-hidden group hover:border-skool-blue/50 transition-all duration-500 shadow-2xl shadow-skool-blue/5">
                                <div className="absolute top-0 right-0 p-8 text-skool-blue/10">
                                    <CheckCircle2 size={120} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase">Karpix Skool</h3>
                                    <p className="text-skool-blue text-sm font-bold tracking-widest uppercase text-left">Цифровая экосистема</p>
                                </div>
                                <ul className="space-y-4">
                                    {[
                                        "Четкая структура курсов и модулей",
                                        "Геймификация: уровни, XP и лидерборды",
                                        "Автоматическая выдача доступа",
                                        "Встроенная аналитика каждого ученика",
                                        "Умный AI-ассистент в каждом уроке"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-4">
                                            <CheckCircle2 className="text-skool-blue shrink-0" size={24} />
                                            <span className="font-bold text-white/90">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Grid */}
                <section className="py-32 max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<BookOpen className="text-skool-blue" size={32} />}
                            title="Структура"
                            desc="Участники видят свой путь обучения, а не бесконечный поток сообщений."
                        />
                        <FeatureCard
                            icon={<Trophy className="text-yellow-400" size={32} />}
                            title="Мотивация"
                            desc="Прогресс-бары, уровни и рейтинги заставляют учеников возвращаться."
                        />
                        <FeatureCard
                            icon={<Zap className="text-cyan-400" size={32} />}
                            title="Скорость"
                            desc="Mini App открывается мгновенно прямо в Telegram. Без лишних сайтов."
                        />
                        <FeatureCard
                            icon={<Users className="text-purple-400" size={32} />}
                            title="Сообщество"
                            desc="Профили учеников с ачивками создают ощущение настоящего клуба."
                        />
                        <FeatureCard
                            icon={<MessageSquare className="text-green-400" size={32} />}
                            title="AI Помощник"
                            desc="Интегрированный ИИ помогает ученикам усваивать материал 24/7."
                        />
                        <FeatureCard
                            icon={<Rocket className="text-orange-400" size={32} />}
                            title="Автоматика"
                            desc="Бот сам проверяет подписки и открывает доступ к новым урокам."
                        />
                    </div>
                </section>

                {/* Application Form */}
                <section id="apply-form" className="py-32 px-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="p-8 lg:p-12 rounded-[48px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-skool-blue to-transparent" />

                            {!submitted ? (
                                <div className="space-y-10">
                                    <div className="text-center space-y-4">
                                        <h2 className="text-4xl font-black uppercase tracking-tight">Стать Автором</h2>
                                        <p className="text-slate-400 font-medium leading-relaxed">
                                            Заполните короткую анкету, и мы свяжемся с вами в Telegram для подключения вашей школы.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Как вас зовут?</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Иван Иванов"
                                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-skool-blue transition-colors font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ваш Telegram (@handle)</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.telegram}
                                                    onChange={e => setFormData({ ...formData, telegram: e.target.value })}
                                                    placeholder="@username"
                                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-skool-blue transition-colors font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Название вашей школы / проекта</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.schoolName}
                                                onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                                                placeholder="Академия Трейдинга"
                                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-skool-blue transition-colors font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">О чем ваше обучение? (Кратко)</label>
                                            <textarea
                                                required
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Обучаем системному маркетингу для экспертов..."
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder:text-slate-600 focus:outline-none focus:border-skool-blue transition-colors font-medium resize-none"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-16 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl font-black text-lg uppercase shadow-2xl shadow-skool-blue/20 group"
                                        >
                                            {isSubmitting ? "Отправка..." : "Отправить заявку"}
                                            <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <div className="py-20 text-center space-y-6 animate-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-400/20">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h2 className="text-4xl font-black uppercase">Заявка принята!</h2>
                                    <p className="text-slate-400 text-lg max-w-sm mx-auto font-medium">
                                        Мы получили ваши данные и свяжемся с вами в Telegram в ближайшее время. Спасибо за интерес!
                                    </p>
                                    <Button
                                        onClick={() => setSubmitted(false)}
                                        variant="link"
                                        className="text-skool-blue font-bold uppercase mt-8"
                                    >
                                        Отправить еще одну
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-20 border-t border-white/5 text-center">
                    <div className="max-w-7xl mx-auto px-6 opacity-30">
                        <span className="text-sm font-bold uppercase tracking-widest">© 2025 Karpix Skool • Все права защищены</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
    <div className="p-10 rounded-[40px] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-300 group hover:-translate-y-2">
        <div className="w-16 h-16 bg-white/[0.05] rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform duration-500">
            {icon}
        </div>
        <h3 className="text-xl font-black uppercase mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
);
