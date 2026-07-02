import { MessageSquare, Monitor, Shield } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

import api from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { consoleTabs } from './constants';
import type { TabType } from './types';

interface SuperAdminHeaderProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onBroadcastOpen: () => void;
}

export const SuperAdminHeader = ({ activeTab, onTabChange, onBroadcastOpen }: SuperAdminHeaderProps) => (
    <>
        <header className="sticky top-0 z-50 bg-background-dark/90 ios-blur px-4 md:px-12 pt-5 md:pt-6 pb-4 border-b border-white/10">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
                        <Shield className="text-primary" size={20} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-semibold leading-tight truncate">Super Admin Console</h1>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-none">Системный режим Karpix Skool</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    <nav className="hidden lg:flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/70">
                        {consoleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === tab.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <tab.icon size={14} strokeWidth={2.1} /> {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:block h-10 w-[1px] bg-zinc-800" />

                    <Button
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 h-10 w-10 rounded-xl border border-white/10 shrink-0"
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
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 h-10 w-10 rounded-xl border border-white/10 shrink-0"
                        size="icon"
                        onClick={onBroadcastOpen}
                    >
                        <MessageSquare size={16} />
                    </Button>
                </div>
            </div>
        </header>

        <div className="lg:hidden px-4 py-3 border-b border-white/5">
            <nav className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/70 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
                {consoleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-none sm:flex-1",
                            activeTab === tab.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <tab.icon size={14} strokeWidth={2.1} />
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    </>
);
