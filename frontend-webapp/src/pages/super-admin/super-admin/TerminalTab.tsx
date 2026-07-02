import { Activity, Globe, UserPlus, Users } from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { AppUser, FeedItem, Tenant } from './types';

interface TerminalTabProps {
    tenants: Tenant[];
    users: AppUser[];
    feed: FeedItem[];
    time: string;
}

export const TerminalTab = ({ tenants, users, feed, time }: TerminalTabProps) => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
                { label: 'Ученики', value: tenants.reduce((acc, t) => acc + t.member_count, 0), icon: Users, color: 'text-success' },
                { label: 'Школы', value: tenants.length, icon: Globe, color: 'text-primary' },
                { label: 'Аптайм', value: '99.9%', icon: Activity, color: 'text-emerald-500' },
                { label: 'Заявки', value: users.filter(u => u.admin_status === 'pending').length, icon: UserPlus, color: 'text-danger' },
            ].map((stat, i) => (
                <Card key={i} className="bg-card border-border rounded-lg shadow-sm">
                    <CardContent className="p-4 md:p-6">
                        <p className="text-[9px] font-black text-muted-foreground leading-none mb-2">{stat.label}</p>
                        <div className="flex items-center justify-between">
                            <p className="text-xl md:text-2xl font-black truncate">{stat.value}</p>
                            <stat.icon size={16} className={stat.color} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        <Card className="bg-foreground border-border rounded-lg overflow-hidden border-t-2 border-t-primary/30 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Activity size={14} className="text-primary animate-pulse" />
                    <h2 className="text-xs font-semibold text-slate-300">Системная активность</h2>
                </div>
            </div>
            <div className="p-6 h-80 overflow-y-auto font-mono text-[10px] md:text-[11px] space-y-4 terminal-scrollbar relative">
                <div className="scanline absolute inset-0"></div>
                {feed.map((item) => (
                    <div key={item.id} className="flex gap-4">
                        <span className="text-zinc-600 shrink-0 select-none">[{item.time.split(':')[0]}:{item.time.split(':')[1]}]</span>
                        <div className="flex-1 break-words overflow-hidden">
                            <span className={cn("font-bold mr-2",
                                item.type === 'SUCCESS' ? 'text-success' :
                                    item.type === 'MILESTONE' ? 'text-primary' :
                                        item.type === 'ALERT' ? 'text-danger' : 'text-zinc-500'
                            )}>[{item.type}]</span>
                            <span className="text-slate-300">{item.message}</span>
                            {item.meta && <span className="text-primary font-black ml-1">{item.meta}</span>}
                            {item.message_end && <span className="text-slate-300">{item.message_end}</span>}
                        </div>
                    </div>
                ))}
                <div className="flex gap-4 animate-pulse">
                    <span className="text-zinc-600">[{time.split(' ')[0].split(':')[0]}:{time.split(' ')[0].split(':')[1]}]</span>
                    <div className="flex-1 font-black text-primary">_</div>
                </div>
            </div>
        </Card>
    </div>
);
