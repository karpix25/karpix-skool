import { MessageSquare, Monitor, Shield } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

import api from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { desktopTabs, mobileTabs } from './constants';
import type { TabType } from './types';

interface SuperAdminHeaderProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onBroadcastOpen: () => void;
}

export const SuperAdminHeader = ({ activeTab, onTabChange, onBroadcastOpen }: SuperAdminHeaderProps) => (
    <>
        <header className="sticky top-0 z-50 bg-background-dark/80 ios-blur px-6 md:px-12 pt-8 md:pt-12 pb-6 border-b border-white/5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-[16px] md:rounded-[18px] flex items-center justify-center shadow-xl shadow-primary/30">
                        <Shield className="text-white" size={20} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-black uppercase italic leading-none truncate">Nexus</h1>
                        <p className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1.5 opacity-80 leading-none">Терминал</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    <nav className="hidden lg:flex bg-zinc-900/60 p-1.5 rounded-[24px] border border-zinc-800/50">
                        {desktopTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-9 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <tab.icon size={12} strokeWidth={3.5} /> {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:block h-10 w-[1px] bg-zinc-800" />

                    <Button
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-10 w-10 md:h-11 md:w-11 rounded-2xl border border-white/5 shrink-0"
                        size="icon"
                        title="Открыть в браузере"
                        onClick={async () => {
                            try {
                                const res = await api.post('/auth/request-desktop-login');
                                const { login_url } = res.data;
                                if (WebApp.platform !== 'unknown') {
                                    WebApp.openLink(login_url);
                                } else {
                                    window.open(login_url, '_blank');
                                }
                            } catch {
                                alert('Не удалось открыть браузер. Ссылка отправлена в ваш Telegram.');
                            }
                        }}
                    >
                        <Monitor size={16} />
                    </Button>

                    <Button
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-10 w-10 md:h-11 md:w-11 rounded-2xl border border-white/5 shrink-0"
                        size="icon"
                        onClick={onBroadcastOpen}
                    >
                        <MessageSquare size={16} />
                    </Button>
                </div>
            </div>
        </header>

        <div className="lg:hidden px-4 pb-4">
            <nav className="flex bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800/50 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
                {mobileTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1",
                            activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500"
                        )}
                    >
                        <tab.icon size={13} strokeWidth={3} />
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    </>
);
