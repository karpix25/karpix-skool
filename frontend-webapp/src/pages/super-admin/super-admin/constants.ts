import { Activity, Building2, ClipboardList, LayoutDashboard, Users } from 'lucide-react';

import { Tab } from './types';

export const consoleTabs = [
    { id: Tab.TERMINAL, label: 'Система', icon: Activity },
    { id: Tab.LEADS, label: 'Заявки', icon: ClipboardList },
    { id: Tab.GLOBAL, label: 'Школы', icon: Building2 },
    { id: Tab.AUTHORS, label: 'Авторы', icon: Users },
    { id: Tab.MY_SCHOOL, label: 'Школа', icon: LayoutDashboard },
];
