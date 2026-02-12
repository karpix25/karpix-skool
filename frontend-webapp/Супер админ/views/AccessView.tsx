
import React from 'react';
import { AuthorRequest } from '../types';

const AccessView: React.FC = () => {
  const requests: AuthorRequest[] = [
    { id: '1', name: 'Alex Rivera', handle: '@arivera_dev', status: 'online', avatar: 'https://picsum.photos/seed/alex/100/100' },
    { id: '2', name: 'Elena Vance', handle: '@elena_nexus', status: 'away', avatar: 'https://picsum.photos/seed/elena/100/100' },
    { id: '3', name: 'Marcus Thorne', handle: '@mthorne_ops', status: 'online', avatar: 'https://picsum.photos/seed/marcus/100/100' },
    { id: '4', name: 'Sarah Chen', handle: '@schen_web3', status: 'offline', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background-dark/80 ios-blur border-b border-primary/10 px-4 pt-12 pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Author Lifecycle</h1>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-primary/20">Super-Admin</span>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-icons-round text-primary/60 text-lg">search</span>
            </div>
            <div className="w-full bg-white/5 border border-primary/20 rounded-xl py-2.5 pl-10 pr-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">Search commands...</span>
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border border-primary/20 bg-background-dark/20 text-[10px] text-slate-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pending Requests</h2>
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">12 New</span>
          </div>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-card-dark border border-primary/5 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img alt={req.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" src={req.avatar} />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-background-dark rounded-full ${
                      req.status === 'online' ? 'bg-green-500' : req.status === 'away' ? 'bg-yellow-500' : 'bg-slate-500'
                    }`}></div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{req.name}</div>
                    <div className="text-[11px] text-primary font-medium">{req.handle}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">forum</span>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <span className="material-icons-round text-xl">check</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Rights Management</h2>
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-icons-round text-danger text-lg">gpp_maybe</span>
                  <span className="font-bold text-danger text-sm">Global Access Control</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Immediately revoke platform-wide access for all authors. Use only in emergency scenarios.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input className="sr-only peer" type="checkbox" defaultChecked />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger"></div>
              </label>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccessView;
