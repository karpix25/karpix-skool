
import React, { useState } from 'react';
import { Tab } from './types';
import PulseView from './views/PulseView';
import SchoolsView from './views/SchoolsView';
import ContentView from './views/ContentView';
import AccessView from './views/AccessView';
import NexusView from './views/NexusView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PULSE);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.PULSE: return <PulseView />;
      case Tab.SCHOOLS: return <SchoolsView />;
      case Tab.CONTENT: return <ContentView />;
      case Tab.ACCESS: return <AccessView />;
      case Tab.NEXUS: return <NexusView />;
      default: return <PulseView />;
    }
  };

  const navItems = [
    { id: Tab.PULSE, label: 'Pulse', icon: 'bolt' },
    { id: Tab.SCHOOLS, label: 'Schools', icon: 'school' },
    { id: Tab.CONTENT, label: 'Content', icon: 'library_books' },
    { id: Tab.ACCESS, label: 'Access', icon: 'key' },
    { id: Tab.NEXUS, label: 'Nexus', icon: 'hub' },
  ];

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col">
      {/* Dynamic Viewport */}
      <main className="flex-1 overflow-y-auto pb-32">
        {renderContent()}
      </main>

      {/* Persistent Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a0a0c]/90 ios-blur border-t border-zinc-800 pb-8 pt-3 px-6 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === item.id ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === item.id ? 'bg-primary text-white' : ''
              }`}>
                <span className="material-icons-round">{item.icon}</span>
              </div>
              <span className={`text-[10px] font-bold ${activeTab === item.id ? 'text-primary' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        {/* iOS Indicator */}
        <div className="mt-4 mx-auto w-32 h-1 bg-zinc-800 rounded-full"></div>
      </nav>
    </div>
  );
};

export default App;
