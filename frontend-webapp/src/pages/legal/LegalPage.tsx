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
        <div className="min-h-dvh bg-background px-4 py-5 animate-in fade-in duration-300 sm:px-6">
            <header className="mx-auto mb-8 flex max-w-2xl items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h1 className="text-xl font-semibold">{content.title}</h1>
            </header>

            <div className="space-y-8 max-w-2xl mx-auto">
                <div className="qa-surface flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {type === 'privacy' ? <Shield size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Последнее обновление</p>
                        <p className="text-sm font-semibold">{content.lastUpdated}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {content.sections.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {section.text}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-muted text-center">
                    <p className="text-xs font-medium text-muted-foreground">
                        Платформа СКУЛ &copy; 2026
                    </p>
                </div>
            </div>
        </div>
    );
};
