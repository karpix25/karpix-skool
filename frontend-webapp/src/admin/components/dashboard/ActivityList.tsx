import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import { Star, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ActivityItem {
    type: 'join' | 'progress' | 'payment' | 'level' | 'completion';
    user_name: string;
    avatar_url?: string;
    timestamp: string;
    detail: string;
    role?: string;
    value?: string;
    isUnread?: boolean;
}

interface ActivityListProps {
    activities: ActivityItem[];
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities }) => {
    return (
        <section className="bg-card rounded-lg border border-border shadow-sm overflow-hidden text-card-foreground">
            <div className="p-4 flex items-center justify-between border-b border-border">
                <h3 className="font-semibold text-sm">Последняя активность</h3>
                <button className="text-[10px] text-primary font-bold">Все</button>
            </div>
            <div className="divide-y divide-border">
                {activities.map((item, idx) => (
                    <div key={idx} className="p-4 flex gap-3 items-center hover:bg-muted/50 transition-colors">
                        {item.type === 'payment' ? (
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <CreditCard className="text-success w-5 h-5" />
                            </div>
                        ) : (
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={item.avatar_url} />
                                <AvatarFallback>{item.user_name?.[0]}</AvatarFallback>
                            </Avatar>
                        )}

                        <div className="flex-1">
                            <div className="text-xs font-medium leading-tight">
                                {item.type !== 'payment' && <span className="font-bold">{item.user_name} </span>}
                                {item.detail}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ru })} • {item.type === 'payment' ? (
                                    <span className="text-success font-bold">{item.value}</span>
                                ) : (
                                    item.role || 'Участник'
                                )}
                            </div>
                        </div>

                        {item.isUnread && <div className="w-2 h-2 rounded-full bg-primary" />}
                        {item.type === 'level' && <Star className="text-vip fill-vip w-3.5 h-3.5" />}
                    </div>
                ))}
            </div>
        </section>
    );
};
