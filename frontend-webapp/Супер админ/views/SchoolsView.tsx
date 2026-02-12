
import React from 'react';
import { School } from '../types';

const SchoolsView: React.FC = () => {
  const schools: School[] = [
    { id: '1', name: 'Academy of Learning', initials: 'AL', students: 1240, status: 'Admin Active', botStatus: 'Online', color: 'bg-primary' },
    { id: '2', name: 'Nexus Scholars', initials: 'NS', students: 842, status: 'Not Admin', botStatus: 'Connection Lost', color: 'bg-orange-500' },
    { id: '3', name: 'Quantum University', initials: 'QU', students: 3120, status: 'Admin Active', botStatus: 'Online', color: 'bg-purple-600' },
    { id: '4', name: 'Blue Tech Inst.', initials: 'BT', students: 210, status: 'Initializing', botStatus: 'Pending Sync', color: 'bg-blue-500' },
  ];

  return (
    <div className="p-5 space-y-6 bg-background-dark min-h-screen">
      <header>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-lexend">Schools & Health</h1>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <span className="material-icons-round text-primary text-sm">admin_panel_settings</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input className="w-full bg-card-dark border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all text-white" placeholder="Search schools..." type="text"/>
          </div>
          <button className="flex items-center gap-1 bg-card-dark border-none rounded-lg px-3 py-2 text-sm font-medium text-slate-300">
            <span className="material-icons-round text-sm">filter_list</span>
            <span>Active</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card-dark border border-zinc-800 p-3 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Schools</p>
          <p className="text-xl font-bold">124</p>
        </div>
        <div className="bg-card-dark border border-zinc-800 p-3 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Health Score</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-green-400">98%</p>
            <span className="material-icons-round text-green-400 text-sm">trending_up</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {schools.map(school => (
          <div key={school.id} className={`bg-card-dark border border-zinc-800 rounded-xl p-4 shadow-sm ${school.status === 'Not Admin' ? 'border-l-4 border-l-danger' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-lg ${school.color} flex items-center justify-center text-white font-bold`}>
                  {school.initials}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{school.name}</h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="material-icons-round text-[12px]">groups</span>
                    {school.students.toLocaleString()} Students
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase ${
                school.status === 'Admin Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                school.status === 'Not Admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
              }`}>
                {school.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex gap-1 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    school.botStatus === 'Online' ? 'bg-green-500' : 
                    school.botStatus === 'Connection Lost' ? 'bg-red-500 animate-pulse' : 
                    school.botStatus === 'Pending Sync' ? 'bg-amber-400' : 'bg-zinc-600'
                  }`}></span>
                  <span className={school.botStatus === 'Connection Lost' ? 'text-danger' : 'text-slate-500'}>
                    Bot {school.botStatus}
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                <button className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-transform ${school.botStatus === 'Connection Lost' ? 'bg-primary text-white' : 'bg-zinc-800 text-slate-300'}`}>
                  <span className="material-icons-round text-sm">sensors</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-slate-300 active:scale-95 transition-transform">
                  <span className="material-icons-round text-sm">visibility</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-slate-300 active:scale-95 transition-transform">
                  <span className="material-icons-round text-sm">sync</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchoolsView;
