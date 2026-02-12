import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminBottomNav } from './AdminBottomNav';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

export const Layout: React.FC = () => {
    return (
        <div className="flex bg-background min-h-screen text-foreground">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative animate-in fade-in duration-300">
                {/* iOS Status Bar Spacer */}
                <div className="h-10 w-full flex items-center justify-between px-6 sticky top-0 z-[60] bg-background/95 backdrop-blur-md md:hidden font-sans">
                    <span className="text-sm font-semibold select-none">9:41</span>
                    <div className="flex items-center gap-1.5 opacity-80">
                        <Signal className="w-3.5 h-3.5" />
                        <Wifi className="w-3.5 h-3.5" />
                        <BatteryFull className="w-4 h-4" />
                    </div>
                </div>

                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <AdminBottomNav />
        </div>
    );
};
