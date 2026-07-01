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
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[30px] bg-primary flex items-center justify-center text-white font-black text-2xl italic shadow-2xl shadow-primary/20">
                            {school.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{school.name}</h2>
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mt-1">Моя школа</p>
                        </div>
                    </div>

                    <div className="bg-success/10 border border-success/20 p-4 rounded-[24px] flex flex-col items-center md:items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success mb-1">Ключ подключения</span>
                        <span className="text-xl font-mono font-black text-white select-all">{school.setup_code}</span>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    <Card className="bg-primary p-5 md:p-6 rounded-[32px] border-none text-white shadow-xl shadow-primary/20 col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Доход (месяц)</p>
                        <p className="text-2xl md:text-3xl font-black mt-2 font-mono tracking-tighter">$12,402</p>
                    </Card>
                    <Card className="bg-card-dark p-5 md:p-6 rounded-[32px] border-zinc-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Студенты</p>
                        <p className="text-2xl md:text-3xl font-black mt-2">{school.member_count}</p>
                    </Card>
                    <Card className="bg-card-dark p-5 md:p-6 rounded-[32px] border-zinc-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Курсы</p>
                        <p className="text-2xl md:text-3xl font-black mt-2">{school.course_count}</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-card-dark p-6 rounded-[32px] border-zinc-800 border-2 border-dashed border-primary/20 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Globe size={16} className="text-primary" />
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-widest">Интеграция Telegram</h4>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                                {school.telegram_group_id
                                    ? "Связь активна. Ваша группа подключена и синхронизирована со школой."
                                    : "Подключите Telegram-группу для студентов, отслеживания XP и доступа по группе."}
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Ключ подключения:</span>
                            <span className="text-sm font-mono font-bold text-success animate-pulse select-all">{school.setup_code}</span>
                        </div>
                    </Card>

                    <div className="bg-zinc-900/40 rounded-[40px] p-6 md:p-8 border border-zinc-800">
                        <h4 className="font-black text-zinc-500 uppercase tracking-widest text-[10px] mb-6 pl-2">Локальная активность</h4>
                        <div className="space-y-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-300 break-words leading-relaxed">Синхронизация записи @tg_user_{i}</p>
                                        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">ТОЛЬКО ЧТО</p>
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
                <p className="text-xs font-black uppercase tracking-widest">Рабочее пространство офлайн</p>
            </div>
        )}
    </div>
);
