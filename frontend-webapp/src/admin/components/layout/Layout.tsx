import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminBottomNav } from './AdminBottomNav';
import { SuperAdminWorkspaceSwitcher } from '../../../pages/super-admin/context-switcher/SuperAdminWorkspaceSwitcher';

export const Layout: React.FC = () => {
    return (
        <div className="flex bg-background min-h-dvh text-foreground relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative animate-in fade-in duration-300">
                <SuperAdminWorkspaceSwitcher />
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <AdminBottomNav />
        </div>
    );
};
