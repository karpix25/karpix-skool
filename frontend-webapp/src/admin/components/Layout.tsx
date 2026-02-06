import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const Layout: React.FC = () => {
    return (
        <div className="flex bg-[#F9FAFB] min-h-screen">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <MobileNav />
        </div>
    );
};
