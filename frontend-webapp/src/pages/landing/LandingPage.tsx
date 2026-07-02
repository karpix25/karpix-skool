import React, { useState } from 'react';
import {
    BookOpen,
    CheckCircle2,
    ChevronRight,
    FileText,
    GraduationCap,
    Lock,
    MessageSquare,
    Send,
    ShieldCheck,
    Trophy,
    Users,
    XCircle,
    Zap,
} from 'lucide-react';

import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

const oldGroupProblems = [
    'Материалы теряются в потоке сообщений',
    'Ученик не понимает, что проходить дальше',
    'Автору сложно видеть прогресс и доступы',
    'Оплата, подписка и выдача уроков живут отдельно',
];

const platformWins = [
    'Курсы, модули и уроки собраны в понятный путь',
    'Доступы открываются по правилам школы',
    'Ученик видит прогресс, XP, уровни и рейтинг',
    'Автор управляет студентами, курсами и публикацией',
];

const features = [
    {
        icon: BookOpen,
        title: 'Курсы без хаоса',
        text: 'Структура уроков, статусы доступа и понятный порядок прохождения.',
    },
    {
        icon: Users,
        title: 'Ученики под контролем',
        text: 'Админ видит заявки, роли, прогресс и активность в одной панели.',
    },
    {
        icon: Trophy,
        title: 'Мотивация',
        text: 'Уровни, XP и лидерборд помогают возвращать студентов к обучению.',
    },
    {
        icon: MessageSquare,
        title: 'Telegram first',
        text: 'Mini App открывается внутри Telegram и не требует отдельной привычки.',
    },
    {
        icon: ShieldCheck,
        title: 'Доступы',
        text: 'VIP, закрытые уроки и черновики отображаются ясно для каждой роли.',
    },
    {
        icon: Zap,
        title: 'Быстрый запуск',
        text: 'Автор может собрать школу, курс и первые уроки без лишнего стека.',
    },
];

export const LandingPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        telegram: '',
        schoolName: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const scrollToApply = () => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });

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
        <div className="qa-page overflow-x-hidden selection:bg-primary/10">
            <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/85 px-4 py-3 ios-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <GraduationCap size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold leading-tight">Karpix Skool</p>
                            <p className="hidden text-xs text-muted-foreground sm:block">Школа внутри Telegram</p>
                        </div>
                    </div>
                    <Button onClick={scrollToApply} size="sm" className="shrink-0">
                        Стать автором
                    </Button>
                </div>
            </nav>

            <header className="border-b border-border/70">
                <div className="qa-container grid gap-8 py-8 sm:py-10 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:py-14">
                    <div className="space-y-6">
                        <div className="qa-chip qa-chip-active">
                            <ShieldCheck size={14} />
                            Mini App для обучения и школ
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                                Karpix Skool
                            </h1>
                            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                                Платформа для авторов, которые хотят вести курсы в Telegram
                                без хаоса из файлов, чатов и ручной выдачи доступа.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button onClick={scrollToApply} size="lg" className="w-full sm:w-auto">
                                Создать школу
                                <ChevronRight size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto"
                                onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Как это работает
                            </Button>
                        </div>
                    </div>

                    <ProductPreview />
                </div>
            </header>

            <section id="comparison" className="qa-container py-10">
                <div className="mb-6 max-w-2xl space-y-2">
                    <h2 className="qa-title">Что меняется для автора</h2>
                    <p className="qa-subtitle">
                        Интерфейс не пытается заменить Telegram. Он добавляет к нему
                        структуру, роли, доступы и понятный прогресс.
                    </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <ComparePanel title="Обычная группа" tone="muted" items={oldGroupProblems} icon="bad" />
                    <ComparePanel title="Karpix Skool" tone="accent" items={platformWins} icon="good" />
                </div>
            </section>

            <section className="qa-container py-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <article key={feature.title} className="qa-surface p-5">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon size={20} />
                                </div>
                                <h3 className="text-base font-semibold">{feature.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section id="apply-form" className="qa-container py-10">
                <div className="mx-auto max-w-3xl qa-panel p-5 sm:p-7">
                    {!submitted ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="qa-title">Заявка автора</h2>
                                <p className="qa-subtitle">
                                    Напишите, что за школа у вас будет. Мы свяжемся с вами
                                    в Telegram и поможем подключить первый запуск.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Имя">
                                        <Input
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Иван Иванов"
                                        />
                                    </Field>
                                    <Field label="Telegram">
                                        <Input
                                            required
                                            value={formData.telegram}
                                            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                                            placeholder="@username"
                                        />
                                    </Field>
                                </div>
                                <Field label="Название школы">
                                    <Input
                                        required
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        placeholder="Академия маркетинга"
                                    />
                                </Field>
                                <Field label="О чем обучение">
                                    <Textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Например: курс для экспертов, которые запускают консультации..."
                                    />
                                </Field>
                                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                                    {isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
                                    <Send size={18} />
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
                                <CheckCircle2 size={28} />
                            </div>
                            <h2 className="text-2xl font-semibold">Заявка принята</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                Мы получили ваши данные и свяжемся с вами в Telegram.
                            </p>
                            <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-6">
                                Отправить ещё одну
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            <footer className="border-t border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Karpix Skool © 2026
            </footer>
        </div>
    );
};

const ProductPreview: React.FC = () => (
    <div className="qa-panel overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div>
                <p className="text-sm font-semibold">Школа автора</p>
                <p className="text-xs text-muted-foreground">Сегодня: 126 учеников</p>
            </div>
            <span className="qa-chip qa-chip-active">Активна</span>
        </div>
        <div className="grid gap-3">
            <PreviewCourse title="Запуск продукта" progress="72%" state="Открыт" />
            <PreviewCourse title="VIP-разборы" progress="18%" state="VIP" vip />
            <PreviewCourse title="Модуль 4: продажи" progress="0%" state="Закрыт" locked />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
            <PreviewMetric label="XP" value="12.4k" />
            <PreviewMetric label="Уроков" value="38" />
            <PreviewMetric label="Доступов" value="91%" />
        </div>
    </div>
);

const PreviewCourse: React.FC<{ title: string; progress: string; state: string; vip?: boolean; locked?: boolean }> = ({
    title,
    progress,
    state,
    vip,
    locked,
}) => (
    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">Прогресс {progress}</p>
            </div>
            <span className={`qa-chip ${vip ? 'border-vip/30 bg-vip/10 text-vip' : locked ? '' : 'qa-chip-active'}`}>
                {locked && <Lock size={12} />}
                {state}
            </span>
        </div>
    </div>
);

const PreviewMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
);

const ComparePanel: React.FC<{
    title: string;
    tone: 'muted' | 'accent';
    items: string[];
    icon: 'good' | 'bad';
}> = ({ title, tone, items, icon }) => (
    <article className={tone === 'accent' ? 'qa-surface border-primary/25 bg-primary/5 p-5' : 'qa-surface p-5'}>
        <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            {icon === 'good' ? (
                <CheckCircle2 className="text-primary" size={22} />
            ) : (
                <XCircle className="text-muted-foreground" size={22} />
            )}
        </div>
        <ul className="space-y-3">
            {items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    {icon === 'good' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    </article>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block space-y-2 text-sm font-medium">
        <span>{label}</span>
        {children}
    </label>
);
