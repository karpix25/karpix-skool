import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Shield, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';

export const LegalPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'tos'; // 'tos' or 'privacy'

    const content = type === 'privacy' ? {
        title: 'Политика конфиденциальности',
        lastUpdated: '16 февраля 2026',
        sections: [
            {
                title: '1. Сбор данных',
                text: 'Мы собираем ваш Telegram ID, имя пользователя и аватар для обеспечения работы образовательной платформы.'
            },
            {
                title: '2. Использование информации',
                text: 'Данные используются для синхронизации прогресса обучения, отображения в рейтингах и связи с администрацией школ.'
            },
            {
                title: '3. Защита данных',
                text: 'Мы используем современные методы шифрования и безопасное облачное хранилище для защиты ваших персональных данных.'
            }
        ]
    } : {
        title: 'Условия использования',
        lastUpdated: '16 февраля 2026',
        sections: [
            {
                title: '1. Общие положения',
                text: 'Пользуясь платформой СКУЛ, вы соглашаетесь с данными условиями. Платформа предоставляет инструменты для создания и прохождения курсов.'
            },
            {
                title: '2. Правила сообщества',
                text: 'Запрещено размещение контента, нарушающего законодательство или права третьих лиц. Мы оставляем за собой право приостановить доступ при нарушениях.'
            },
            {
                title: '3. Ответственность',
                text: 'Администрация платформы не несет ответственности за содержание курсов, созданных независимыми авторами.'
            }
        ]
    };

    return (
        <div className="min-h-screen bg-background p-6 animate-in fade-in duration-500">
            <header className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h1 className="text-xl font-bold">{content.title}</h1>
            </header>

            <div className="space-y-8 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        {type === 'privacy' ? <Shield size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Последнее обновление</p>
                        <p className="text-sm font-bold">{content.lastUpdated}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {content.sections.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {section.text}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-muted text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                        Платформа СКУЛ &copy; 2026
                    </p>
                </div>
            </div>
        </div>
    );
};
