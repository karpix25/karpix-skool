import { Activity, Building2, LayoutDashboard, Users } from 'lucide-react';

import { Tab } from './types';
import type { FeedItem } from './types';

export const consoleTabs = [
    { id: Tab.TERMINAL, label: 'Система', icon: Activity },
    { id: Tab.GLOBAL, label: 'Школы', icon: Building2 },
    { id: Tab.AUTHORS, label: 'Авторы', icon: Users },
    { id: Tab.MY_SCHOOL, label: 'Школа', icon: LayoutDashboard },
];

export const feedItems: FeedItem[] = [
    { id: '1', time: '14:21:44', type: 'SUCCESS', message: 'School Alpha: New lesson ', meta: '"Advanced DeFi"', message_end: ' added.' },
    { id: '2', time: '14:20:12', type: 'MILESTONE', message: 'User ', meta: '@crypto_king', message_end: ' reached Level 10.' },
    { id: '3', time: '14:19:55', type: 'SYSTEM', message: 'Nodes: latency optimization complete.' },
    { id: '4', time: '14:18:02', type: 'ALERT', message: 'School Delta: brute-force attempt blocked.' },
    { id: '5', time: '14:16:30', type: 'SUCCESS', message: 'System: v2.4.0 signal stable.' },
];
