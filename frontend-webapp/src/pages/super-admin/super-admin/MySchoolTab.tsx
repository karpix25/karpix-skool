import { Activity, Globe } from 'lucide-react';

import { Card } from '../../../components/ui/card';
import type { Tenant } from './types';

interface MySchoolTabProps {
    school: Tenant | undefined;
}

export const MySchoolTab = ({ school }: MySchoolTabProps) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {school ? (
            <>
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-primary flex items-center justify-center text-white font-black text-2xl shadow-sm">
                            {school.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-semibold">{school.name}</h2>
                            <p className="text-primary text-[10px] font-black mt-1">Моя школа</p>
                        </div>
                    </div>

                    <div className="bg-success/10 border border-success/20 p-4 rounded-lg flex flex-col items-center md:items-end">
                        <span className="text-[10px] font-black text-success mb-1">Ключ подключения</span>
                        <span className="text-xl font-mono font-black text-foreground select-all">{school.setup_code}</span>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    <Card className="bg-primary p-5 md:p-6 rounded-lg border-none text-white shadow-sm col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black opacity-60">Доход (месяц)</p>
                        <p className="text-2xl md:text-3xl font-black mt-2 font-mono">$12,402</p>
                    </Card>
                    <Card className="bg-card p-5 md:p-6 rounded-lg border-border shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground">Студенты</p>
                        <p className="text-2xl md:text-3xl font-black mt-2">{school.member_count}</p>
                    </Card>
                    <Card className="bg-card p-5 md:p-6 rounded-lg border-border shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground">Курсы</p>
                        <p className="text-2xl md:text-3xl font-black mt-2">{school.course_count}</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-card p-6 rounded-lg border border-dashed border-primary/25 flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Globe size={16} className="text-primary" />
                                </div>
                                <h4 className="text-sm font-black">Интеграция Telegram</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                                {school.telegram_group_id
                                    ? "Связь активна. Ваша группа подключена и синхронизирована со школой."
                                    : "Подключите Telegram-группу для студентов, отслеживания XP и доступа по группе."}
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                            <span className="text-[10px] font-black text-muted-foreground">Ключ подключения:</span>
                            <span className="text-sm font-mono font-bold text-success select-all">{school.setup_code}</span>
                        </div>
                    </Card>

                    <div className="bg-card rounded-lg p-6 md:p-8 border border-border shadow-sm">
                        <h4 className="font-black text-muted-foreground text-[10px] mb-6 pl-2">Локальная активность</h4>
                        <div className="space-y-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-foreground break-words leading-relaxed">Синхронизация записи @tg_user_{i}</p>
                                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">ТОЛЬКО ЧТО</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <div className="text-center py-20 grayscale opacity-40">
                <Activity size={40} className="mx-auto mb-4" />
                <p className="text-xs font-black">Рабочее пространство офлайн</p>
            </div>
        )}
    </div>
);
