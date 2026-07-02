import { Activity, Globe } from 'lucide-react';

import { Card } from '../../../components/ui/card';
import type { Tenant } from './types';

interface MySchoolTabProps {
    school: Tenant | undefined;
}

export const MySchoolTab = ({ school }: MySchoolTabProps) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {school ? (
            <>
                <header className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
                            {school.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Рабочая школа</p>
                            <h2 className="truncate text-2xl font-semibold leading-tight">{school.name}</h2>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-success/20 bg-success/10 p-3">
                        <span className="text-xs font-medium text-success">Ключ подключения</span>
                        <span className="mt-1 block select-all font-mono text-lg font-semibold text-foreground">{school.setup_code}</span>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-2">
                    <Card className="rounded-2xl border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <p className="text-xs font-medium text-muted-foreground">Студенты</p>
                        <p className="mt-2 font-mono text-2xl font-semibold">{school.member_count}</p>
                    </Card>
                    <Card className="rounded-2xl border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <p className="text-xs font-medium text-muted-foreground">Курсы</p>
                        <p className="mt-2 font-mono text-2xl font-semibold">{school.course_count}</p>
                    </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Card className="flex flex-col justify-between rounded-2xl border border-dashed border-primary/25 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                    <Globe size={16} className="text-primary" />
                                </div>
                                <h4 className="text-sm font-semibold">Интеграция Telegram</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                                {school.telegram_group_id
                                    ? "Связь активна. Ваша группа подключена и синхронизирована со школой."
                                    : "Подключите Telegram-группу для студентов, отслеживания XP и доступа по группе."}
                            </p>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                            <span className="text-xs text-muted-foreground">Ключ</span>
                            <span className="select-all font-mono text-sm font-semibold text-success">{school.setup_code}</span>
                        </div>
                    </Card>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <h4 className="mb-4 text-sm font-semibold">Локальная активность</h4>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="break-words text-xs font-medium leading-relaxed text-foreground">Синхронизация записи @tg_user_{i}</p>
                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">только что</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
                <Activity size={40} className="mx-auto mb-4" />
                <p className="text-sm font-medium">Рабочее пространство офлайн</p>
            </div>
        )}
    </div>
);
