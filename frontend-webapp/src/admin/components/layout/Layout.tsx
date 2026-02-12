import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminBottomNav } from './AdminBottomNav';
import { ActionOverlay } from './ActionOverlay';

export const Layout: React.FC = () => {
    const [isActionOpen, setIsActionOpen] = useState(false);

    return (
        <div className="flex bg-background min-h-screen text-foreground relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative animate-in fade-in duration-300">
                <Outlet />
            </main>

            {/* Global Overlay */}
            <ActionOverlay isOpen={isActionOpen} onClose={() => setIsActionOpen(false)} />

            {/* Mobile Bottom Nav */}
            <AdminBottomNav onPlusClick={() => setIsActionOpen(true)} />
        </div>
    );
};
