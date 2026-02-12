
import React, { useState } from 'react';
import { Bell, Users, GraduationCap, CreditCard, UserPlus, Signal, Wifi, BatteryFull } from 'lucide-react';
import { TimeFilter } from './types';
import { KpiCard } from './components/KpiCard';
import { ActivityChart } from './components/ActivityChart';
import { ActivityList } from './components/ActivityList';
import { BottomNav } from './components/BottomNav';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TimeFilter.TODAY);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* iOS Status Bar Spacer */}
      <div className="h-10 w-full flex items-center justify-between px-6 sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 ios-blur">
        <span className="text-sm font-semibold">9:41</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <BatteryFull className="w-4 h-4" />
        </div>
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">School of Creators</p>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center relative transition-transform active:scale-95">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background-light dark:border-background-dark"></span>
          </button>
          <img 
            src="https://picsum.photos/seed/admin/100/100" 
            alt="Admin" 
            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 object-cover shadow-sm"
          />
        </div>
      </header>

      {/* Time Filter Tabs */}
      <div className="px-6 mb-6">
        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg flex gap-1">
          {Object.values(TimeFilter).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeFilter === filter 
                  ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <KpiCard 
            icon={<Users className="w-5 h-5" />} 
            label="Total Students" 
            value="12.4k" 
            trend="+12%" 
          />
          <KpiCard 
            icon={<GraduationCap className="w-5 h-5" />} 
            label="Live Courses" 
            value="42" 
          />
          <KpiCard 
            icon={<CreditCard className="w-5 h-5" />} 
            label="Revenue (MTD)" 
            value="$4.2k" 
            trend="+8%" 
          />
          <KpiCard 
            icon={<UserPlus className="w-5 h-5" />} 
            label="New Joins" 
            value="128" 
          />
        </div>

        {/* Growth Activity */}
        <ActivityChart />

        {/* Recent Activity */}
        <ActivityList />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
