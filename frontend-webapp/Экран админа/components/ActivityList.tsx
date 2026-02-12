
import React from 'react';
import { ActivityItem } from '../types';
import { Star, CreditCard } from 'lucide-react';

const activities: ActivityItem[] = [
  {
    id: '1',
    type: 'join',
    user: {
      name: 'John Doe',
      avatar: 'https://picsum.photos/seed/john/100/100',
      role: 'Free Member'
    },
    details: 'joined the group',
    timestamp: '2m ago',
    isUnread: true
  },
  {
    id: '2',
    type: 'level',
    user: {
      name: 'Jane Smith',
      avatar: 'https://picsum.photos/seed/jane/100/100',
      role: 'Premium Member'
    },
    details: 'reached Level 5',
    timestamp: '15m ago'
  },
  {
    id: '3',
    type: 'payment',
    user: {
      name: 'System',
      avatar: '',
      role: ''
    },
    details: 'New Payment Received',
    timestamp: '1h ago',
    value: '+$49.00'
  },
  {
    id: '4',
    type: 'completion',
    user: {
      name: 'Mike Ross',
      avatar: 'https://picsum.photos/seed/mike/100/100',
      role: 'Student'
    },
    details: 'completed Intro to SaaS',
    timestamp: '3h ago'
  }
];

export const ActivityList: React.FC = () => {
  return (
    <section className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-sm">Recent Activity</h3>
        <button className="text-[10px] text-primary font-bold uppercase tracking-wide">See All</button>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {activities.map((item) => (
          <div key={item.id} className="p-4 flex gap-3 items-center">
            {item.type === 'payment' ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="text-emerald-500 w-5 h-5" />
              </div>
            ) : (
              <img src={item.user.avatar} alt={item.user.name} className="w-10 h-10 rounded-full object-cover" />
            )}
            
            <div className="flex-1">
              <div className="text-xs font-medium leading-tight">
                {item.type !== 'payment' && <span className="font-bold">{item.user.name} </span>}
                {item.details.includes('Level 5') ? (
                   <>reached <span className="text-primary font-semibold">Level 5</span></>
                ) : item.details.includes('Intro to SaaS') ? (
                  <>completed <span className="text-primary font-semibold">Intro to SaaS</span></>
                ) : (
                  item.details
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {item.timestamp} • {item.type === 'payment' ? (
                  <span className="text-emerald-500 font-bold">{item.value}</span>
                ) : (
                  item.user.role
                )}
              </div>
            </div>

            {item.isUnread && <div className="w-2 h-2 rounded-full bg-primary" />}
            {item.type === 'level' && <Star className="text-amber-500 fill-amber-500 w-3.5 h-3.5" />}
          </div>
        ))}
      </div>
    </section>
  );
};
