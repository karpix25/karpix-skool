import { MessageSquare, Monitor, Shield } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

import api from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { openExternalLink } from '../../../lib/externalLinks';
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
        <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 px-4 py-3 ios-blur sm:px-5 md:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                <div className="flex min-w-0 shrink items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Shield className="text-primary" size={20} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-semibold leading-tight md:text-lg">Super Admin</h1>
                        <p className="mt-0.5 hidden text-xs leading-none text-muted-foreground min-[380px]:block">Karpix Skool</p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 md:gap-4">
                    <nav className="hidden rounded-xl border border-border bg-muted/70 p-1 lg:flex">
                        {consoleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                aria-pressed={activeTab === tab.id}
                                className={cn(
                                    "flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25",
                                    activeTab === tab.id ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <tab.icon size={14} strokeWidth={2.1} /> {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden h-8 w-px bg-border md:block" />

                    <Button
                        className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                        size="icon"
                        title="Открыть в браузере"
                        aria-label="Открыть в браузере"
                        onClick={async () => {
                            try {
                                const res = await api.post('/auth/request-desktop-login');
                                const { login_url } = res.data;
                                if (WebApp.platform !== 'unknown') {
                                    WebApp.openLink(login_url);
                                } else {
                                    openExternalLink(login_url);
                                }
                            } catch {
                                alert('Не удалось открыть браузер. Ссылка отправлена в ваш Telegram.');
                            }
                        }}
                    >
                        <Monitor size={16} />
                    </Button>

                    <Button
                        className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                        size="icon"
                        title="Открыть рассылку"
                        aria-label="Открыть рассылку"
                        onClick={onBroadcastOpen}
                    >
                        <MessageSquare size={16} />
                    </Button>
                </div>
            </div>
        </header>

        <div className="border-b border-border/70 bg-background px-3 py-2 lg:hidden">
            <nav className="mx-auto grid max-w-6xl grid-cols-4 gap-1 rounded-xl border border-border bg-muted/65 p-1">
                {consoleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        aria-pressed={activeTab === tab.id}
                        className={cn(
                            "flex h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 min-[380px]:gap-1.5 min-[380px]:text-xs",
                            activeTab === tab.id ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                        <span className="truncate">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    </>
);
