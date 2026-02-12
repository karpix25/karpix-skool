
import React from 'react';
import { LayoutDashboard, Users, Plus, BookOpen, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'stats', label: 'Stats', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'add', label: '', icon: Plus, isFab: true },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 ios-blur border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between pb-6 z-50">
        {tabs.map((tab) => {
          if (tab.isFab) {
            return (
              <div key={tab.id} className="relative flex justify-center">
                <button className="bg-primary w-12 h-12 rounded-full -mt-10 shadow-lg shadow-primary/30 flex items-center justify-center transition-transform active:scale-90">
                  <tab.icon className="text-white w-6 h-6" />
                </button>
              </div>
            );
          }

          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Home Indicator Spacer */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-400/30 rounded-full z-[60]" />
    </>
  );
};
